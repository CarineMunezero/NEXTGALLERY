"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

const STUDIO_BUCKET_BASE =
  "https://studio-chocolate.lafrime.foundation/project/default/storage/buckets/";

export default function HomePage() {
  // -------- bucket / upload state --------
  const [buckets, setBuckets] = useState([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [bucketNameInput, setBucketNameInput] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("");

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [status, setStatus] = useState("Ready.");
  const [resultMessage, setResultMessage] = useState("");

  // -------- gallery / studio link --------
  const [galleryItems, setGalleryItems] = useState([]);
  const [studioHref, setStudioHref] = useState("");
  const [showStudioLink, setShowStudioLink] = useState(false);

  // -------- lightbox --------
  const [lbOpen, setLbOpen] = useState(false);
  const [lbImage, setLbImage] = useState("");
  const [lbCaption, setLbCaption] = useState("");

  // ---------- helper setters ----------
  const setStatusSafe = (text) => {
    setStatus(text);
    setResultMessage("");
  };

  const setResultSafe = (text) => {
    setResultMessage(text);
    setStatus("");
  };

  const resetMessages = () => {
    setStatus("");
    setResultMessage("");
  };

  // ---------- load buckets ----------
  const loadBuckets = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoadingBuckets(true);
      resetMessages();

      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;

      setBuckets(data || []);
    } catch (err) {
      console.error("Error loading buckets", err);
      setResultSafe("Error loading buckets. Check console for details.");
    } finally {
      setLoadingBuckets(false);
      setStatus("Ready.");
    }
  }, []);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  // ---------- create bucket ----------
  const handleCreateBucket = async () => {
    if (!bucketNameInput.trim()) {
      setResultSafe("Please enter a bucket name.");
      return;
    }

    try {
      resetMessages();
      setStatusSafe(`Creating bucket "${bucketNameInput}"…`);

      const { error } = await supabase.storage.createBucket(bucketNameInput, {
        public: true,
      });

      if (error) {
        console.error("Create bucket error:", error);
        setResultSafe(`Error creating bucket: ${error.message}`);
        return;
      }

      setResultSafe(`Bucket "${bucketNameInput}" created successfully.`);
      setBucketNameInput("");
      await loadBuckets();
      setStatus("Ready.");
    } catch (err) {
      console.error("Unexpected error creating bucket:", err);
      setResultSafe("Unexpected error creating bucket. Check console.");
    }
  };

  // ---------- select bucket ----------
  const handleBucketChange = (e) => {
    const bucket = e.target.value;
    setSelectedBucket(bucket);
    setGalleryItems([]);
    setShowStudioLink(false);
    resetMessages();
  };

  // ---------- file selection ----------
  const handleFileInputChange = (e) => {
    resetMessages();
    const newFiles = Array.from(e.target.files || []);
    setFiles(newFiles);
    if (newFiles.length) {
      setStatus(`${newFiles.length} file(s) selected.`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetMessages();

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    setFiles(droppedFiles);
    if (droppedFiles.length) {
      setStatus(`${droppedFiles.length} file(s) selected.`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChooseClick = () => {
    const input = document.getElementById("file-input");
    if (input) input.click();
  };

  // ---------- upload (root, upsert) ----------
  const handleUpload = async () => {
    if (!selectedBucket) {
      setResultSafe("Please select a bucket first.");
      return;
    }
    if (!files.length) {
      setResultSafe("Please choose at least one file.");
      return;
    }

    try {
      setUploading(true);
      resetMessages();
      setStatusSafe(
        `Uploading ${files.length} file(s) to "${selectedBucket}"…`
      );

      const bucket = supabase.storage.from(selectedBucket);

      await Promise.all(
        files.map(async (file) => {
          if (!file.type?.startsWith("image/")) {
            throw new Error(`Not an image: ${file.name}`);
          }
          const path = file.name; // root only, upsert
          const { error } = await bucket.upload(path, file, {
            upsert: true,
            cacheControl: "3600",
          });
          if (error) throw error;
        })
      );

      setFiles([]);
      setStatus("Ready.");
      setResultSafe("✅ Upload complete. Click “Load Gallery”.");
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("Upload failed.");
      setResultSafe(`⚠️ ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  // ---------- load gallery (SIGNED URLs) ----------
    const handleLoadGallery = async () => {
    if (!selectedBucket) {
      setResultSafe("Choose a bucket first.");
      return;
    }

    try {
      setStatusSafe(`Loading images from "${selectedBucket}"…`);
      setGalleryItems([]);

      const bucket = supabase.storage.from(selectedBucket);

      const { data, error } = await bucket.list("", {
        limit: 1000,
        search: "",
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        console.error("List error:", error);
        setResultSafe(`⚠️ ${error.message}`);
        return;
      }

      // Filter to "real" file objects (defensively)
      const objects = (data || []).filter(
        (obj) =>
          obj &&
          typeof obj.name === "string" &&
          obj.name.length > 0 &&
          !obj.name.endsWith("/")
      );

      const items = await Promise.all(
        objects.map(async (obj) => {
          let signedUrl = "";

          // Very defensive around createSignedUrl so "Object not found"
          // never crashes the app.
          try {
            const { data: signed, error: sErr } =
              await bucket.createSignedUrl(obj.name, 60 * 60);

            if (sErr) {
              console.warn(
                `Signed URL error for ${obj.name}:`,
                sErr.message || sErr
              );
            } else {
              signedUrl = signed?.signedUrl || "";
            }
          } catch (err) {
            console.warn(`Signed URL threw for ${obj.name}:`, err);
          }

          return {
            name: obj.name,
            url: signedUrl, // may be "" if we couldn’t get a URL
          };
        })
      );

      setGalleryItems(items);
      setStatus("Ready.");

      setStudioHref(
        STUDIO_BUCKET_BASE + encodeURIComponent(selectedBucket)
      );
      setShowStudioLink(true);
    } catch (err) {
      console.error("Error loading gallery:", err);
      setResultSafe("Error loading gallery. Check console for details.");
    }
  };

  // ---------- lightbox helpers ----------
  const openLightbox = (url, caption = "") => {
    if (!url) return;
    setLbImage(url);
    setLbCaption(caption);
    setLbOpen(true);
  };

  const closeLightbox = () => {
    setLbOpen(false);
    setLbImage("");
    setLbCaption("");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
    };
    if (lbOpen) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [lbOpen]);

  // ---------- render ----------
  return (
    <div className="app-root">
      <main>
        {/* top title bar */}
        <header className="topbar">
          <h1 className="page-title">
            Cloud Storage Manager <span className="spark">⚡</span>
          </h1>
          <p className="sub">
            Create buckets, upload images. (DEV demo using service role key.)
          </p>
        </header>

        {/* TWO COLUMN LAYOUT */}
        <div className="two-col">
          {/* LEFT COLUMN */}
          <section className="card left">
            <div>
              <h2 className="card-title">1. Create New Bucket</h2>
              <div className="row">
                <input
                  id="new-bucket-name"
                  className="input"
                  placeholder="e.g., travel-photos"
                  value={bucketNameInput}
                  onChange={(e) => setBucketNameInput(e.target.value)}
                />
                <button
                  id="btn-create-bucket"
                  className="btn btn-primary"
                  type="button"
                  onClick={handleCreateBucket}
                >
                  Create Bucket
                </button>
              </div>
              {loadingBuckets && (
                <p className="status">Loading buckets from Supabase…</p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h2 className="card-title">2. Select Bucket &amp; Upload</h2>

              <select
                id="bucket-select"
                className="input select"
                value={selectedBucket}
                onChange={handleBucketChange}
              >
                <option value="">-- Select a Bucket --</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div
                id="dropzone"
                className="dropzone"
                aria-label="Drag & Drop Files"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="dz-inner">
                  <p className="dz-title">Drag &amp; Drop Images</p>
                  <p className="dz-or">or</p>
                  <button
                    id="btn-choose"
                    className="btn btn-success"
                    type="button"
                    onClick={handleChooseClick}
                  >
                    Choose Files
                  </button>
                  <input
                    id="file-input"
                    type="file"
                    hidden
                    multiple
                    onChange={handleFileInputChange}
                  />
                </div>
              </div>

              <button
                id="btn-upload"
                className="btn btn-primary block"
                type="button"
                disabled={uploading}
                onClick={handleUpload}
              >
                {uploading ? "Uploading…" : "Upload Selected Files"}
              </button>

              <button
                id="btn-load"
                className="btn btn-secondary block"
                type="button"
                style={{ marginTop: 8 }}
                onClick={handleLoadGallery}
              >
                Load Gallery
              </button>

              {status && (
                <p
                  id="status"
                  className="status"
                  role="status"
                  aria-live="polite"
                >
                  {status}
                </p>
              )}
              {resultMessage && (
                <div id="result" className="result" aria-live="polite">
                  {resultMessage}
                </div>
              )}

              {showStudioLink && studioHref && (
                <p id="studio-link" className="studio-link">
                  <a
                    id="studio-a"
                    href={studioHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open "{selectedBucket}" in Supabase Studio
                  </a>
                </p>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: gallery */}
          <section className="card right">
            <div className="card-header-row">
              <h2 className="card-title">Gallery</h2>
              <div className="gallery-meta">
                <span className="bucket-pill">
                  {selectedBucket || "No bucket selected"}
                </span>{" "}
                • {galleryItems.length} item
                {galleryItems.length === 1 ? "" : "s"}
              </div>
            </div>

            <div id="gallery" className="gallery">
              {galleryItems.length === 0 && (
                <p className="placeholder">
                  Bucket is empty. Upload, then click “Load Gallery”.
                </p>
              )}

              {galleryItems.map((item) => (
                <div key={item.name} className="thumb">
                  {item.url ? (
                    <img
                      className="ph"
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      onClick={() => openLightbox(item.url, item.name)}
                    />
                  ) : (
                    <div className="placeholder">
                      {item.name} (preview unavailable)
                    </div>
                  )}
                  <div className="cap">{item.name}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* LIGHTBOX OVERLAY */}
      <div
        id="lightbox"
        className={`lightbox ${lbOpen ? "open" : ""}`}
        aria-hidden={lbOpen ? "false" : "true"}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLightbox();
        }}
      >
        <button
          id="lb-close"
          className="lb-close"
          type="button"
          onClick={closeLightbox}
        >
          ✕ Close
        </button>
        {lbImage && (
          <div>
            <img id="lb-img" src={lbImage} alt={lbCaption} />
            <div id="lb-cap" className="lb-cap">
              {lbCaption}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



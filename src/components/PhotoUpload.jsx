import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Upload, X, Loader2, User, Building2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
/**
 * Componente de upload de foto para clientes e colaboradores.
 *
 * Props:
 *   currentUrl   – URL atual da foto (string | null)
 *   fallbackColor – cor hex do avatar textual (fallback)
 *   fallbackText  – texto para o avatar textual (iniciais)
 *   type         – 'client' | 'employee' (define a pasta no bucket)
 *   entityId     – ID único da entidade (usado no nome do arquivo)
 *   onUpload     – callback(publicUrl: string) chamado após upload bem-sucedido
 *   size         – tamanho em px do preview circular (padrão 88)
 *   shape        – 'circle' | 'rounded' (padrão 'circle')
 */
export default function PhotoUpload({
  currentUrl,
  fallbackColor = '#6366f1',
  fallbackText = '?',
  type = 'client',
  entityId,
  onUpload,
  size = 88,
  shape = 'circle',
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(currentUrl || null);
  const [error, setError]         = useState(null);
  const [drag, setDrag]           = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const inputRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  // Previne que a tecla ESC feche o modal principal (Funcionarios/Clientes) enquanto corta a foto
  useEffect(() => {
    if (!imageToCrop) return;
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation();
        setImageToCrop(null);
      }
    };
    // capture: true garante que este listener intercepte o evento ANTES do window.addEventListener padrão
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [imageToCrop]);

  const borderRadius = shape === 'circle' ? '50%' : `${Math.round(size * 0.15)}px`;

  const handleFile = async (file) => {
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5 MB.');
      return;
    }

    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      setImageToCrop(objectUrl);
    } catch (err) {
      console.error('File error:', err);
      setError('Erro ao processar a imagem.');
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCropped = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    setUploading(true);
    setError(null);
    try {
      const croppedImageFile = await getCroppedImg(imageToCrop, croppedAreaPixels);

      const objectUrl = URL.createObjectURL(croppedImageFile);
      setPreview(objectUrl);

      // Define caminho único no bucket
      const ext    = croppedImageFile.name.split('.').pop();
      const folder = type === 'employee' ? 'employees' : 'clients';
      const isNew  = !entityId || entityId === 'new';
      const id     = isNew ? `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : entityId;
      const path   = `${folder}/${id}.${ext}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, croppedImageFile, { upsert: true, contentType: croppedImageFile.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      setPreview(publicUrl);
      onUpload?.(publicUrl);
      setImageToCrop(null); // Fecha o modal
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erro ao enviar. Tente novamente.');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clearPhoto = (e) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onUpload?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePhotoClick = (e) => {
    if (uploading) return;

    if (clickTimeoutRef.current) {
      // É um duplo clique
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (preview) {
        setImageToCrop(preview);
      } else {
        inputRef.current?.click();
      }
    } else {
      // Primeiro clique
      clickTimeoutRef.current = setTimeout(() => {
        inputRef.current?.click();
        clickTimeoutRef.current = null;
      }, 400);
    }
  };

  const photoSize = size;
  const iconSize  = Math.round(photoSize * 0.35);

  return (
    <div className="photo-upload-root">
      {/* Área clicável / drag-and-drop */}
      <div
        className={`photo-drop-zone ${drag ? 'dragging' : ''} ${uploading ? 'loading' : ''}`}
        style={{ width: photoSize, height: photoSize, borderRadius, flexShrink: 0 }}
        onClick={handlePhotoClick}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        title={preview ? "1 clique: alterar | 2 cliques: ajustar" : "Clique ou arraste uma foto"}
      >
        {/* Imagem ou avatar de texto */}
        {preview ? (
          <img
            src={preview}
            alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius, display: 'block' }}
          />
        ) : (
          <div
            className="photo-fallback"
            style={{ background: fallbackColor, borderRadius, width: '100%', height: '100%' }}
          >
            {type === 'client'
              ? <Building2 size={iconSize} color="rgba(255,255,255,0.7)" />
              : <User size={iconSize} color="rgba(255,255,255,0.7)" />
            }
            <span className="photo-initials" style={{ fontSize: Math.round(photoSize * 0.22) }}>
              {fallbackText}
            </span>
          </div>
        )}

        {/* Overlay de loading */}
        {uploading && (
          <div className="photo-overlay">
            <Loader2 size={Math.round(photoSize * 0.3)} className="spin" color="white" />
          </div>
        )}

        {/* Overlay de câmera ao hover */}
        {!uploading && (
          <div className="photo-hover-overlay" style={{ borderRadius }}>
            <Camera size={Math.round(photoSize * 0.25)} color="white" />
            <span style={{ fontSize: Math.round(photoSize * 0.13) }}>
              {preview ? 'Alterar' : 'Foto'}
            </span>
          </div>
        )}

        {/* Botão de remover */}
        {preview && !uploading && (
          <button
            type="button"
            className="photo-remove-btn"
            onClick={clearPhoto}
            title="Remover foto"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {/* Label + dica */}
      <div className="photo-label-col">
        <button
          type="button"
          className="photo-upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><Loader2 size={14} className="spin" /> Enviando...</>
            : <><Upload size={14} /> {preview ? 'Trocar foto' : 'Carregar foto'}</>
          }
        </button>
        <span className="photo-hint">JPG, PNG ou WebP · Máx. 5 MB</span>
        {error && (
          <span className="photo-error">
            <AlertCircle size={12} /> {error}
          </span>
        )}
      </div>

      {imageToCrop && createPortal(
        <div 
          onClick={(e) => { e.stopPropagation(); setImageToCrop(null); }}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '90%', maxWidth: '500px', height: '60vh', background: '#111', borderRadius: '12px', overflow: 'hidden' }}
          >
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={shape === 'circle' ? 1 : 1}
              cropShape={shape === 'circle' ? 'round' : 'rect'}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div 
            onClick={e => e.stopPropagation()}
            style={{ marginTop: '20px', display: 'flex', gap: '12px' }}
          >
            <button
              type="button"
              onClick={() => setImageToCrop(null)}
              style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: 500 }}
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUploadCropped}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 500 }}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              {uploading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      <style>{`
        .photo-upload-root {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .photo-drop-zone {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.08);
          transition: border-color 0.2s, transform 0.15s;
          flex-shrink: 0;
        }
        .photo-drop-zone:hover { border-color: rgba(99,102,241,0.5); transform: scale(1.02); }
        .photo-drop-zone.dragging { border-color: #6366f1; border-style: dashed; transform: scale(1.04); }
        .photo-drop-zone.loading { cursor: default; }
        .photo-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .photo-initials {
          color: rgba(255,255,255,0.9);
          font-weight: 700;
          line-height: 1;
          display: none;
        }
        .photo-fallback:has(> .photo-initials:not(:empty)) > svg { display: none; }
        .photo-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: white;
          font-weight: 600;
          opacity: 0;
          transition: all 0.2s;
          backdrop-filter: blur(0px);
        }
        .photo-hover-overlay span { font-size: 11px; }
        .photo-drop-zone:hover .photo-hover-overlay {
          opacity: 1;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
        }
        .photo-remove-btn {
          position: absolute;
          top: 4px; right: 4px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(239,68,68,0.9);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          padding: 0;
        }
        .photo-drop-zone:hover .photo-remove-btn { opacity: 1; }
        .photo-label-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .photo-upload-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 8px;
          color: #a5b4fc;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: fit-content;
        }
        .photo-upload-btn:hover:not(:disabled) {
          background: rgba(99,102,241,0.2);
          border-color: rgba(99,102,241,0.5);
        }
        .photo-upload-btn:disabled { opacity: 0.5; cursor: default; }
        .photo-hint { font-size: 0.75rem; color: var(--text-muted); }
        .photo-error {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          color: #f87171;
        }
        .spin { animation: pu-spin 0.8s linear infinite; }
        @keyframes pu-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

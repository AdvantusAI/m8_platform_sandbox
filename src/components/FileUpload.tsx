
import React, { useState, useRef } from 'react';
import { Upload, X, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (url: string) => void;
  accept?: string;
  bucket?: string; // Keep for compatibility but unused
  folder?: string; // Keep for compatibility but unused
  currentUrl?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = "*/*",
  bucket, // Unused in MongoDB version
  folder = "", // Unused in MongoDB version
  currentUrl,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file) return;

    // Validate file type for images
    if (accept === "image/*" && !file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    try {
      setUploading(true);

      // Convert file to base64 data URL for MongoDB storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onUpload(dataUrl);
        toast.success('Archivo subido exitosamente');
        setUploading(false);
      };
      
      reader.onerror = () => {
        toast.error('Error al procesar el archivo');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = () => {
    onUpload('');
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {accept === "image/*" ? (
              <FileImage className="h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              Arrastra y suelta tu archivo aquí, o{' '}
              <span className="text-primary font-medium">haz clic para seleccionar</span>
            </p>
            {accept === "image/*" && (
              <p className="text-xs text-muted-foreground mt-1">
                Solo se permiten archivos de imagen
              </p>
            )}
          </div>
        )}
      </div>

      {currentUrl && (
        <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-sm text-muted-foreground truncate">Archivo actual</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

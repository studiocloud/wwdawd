import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
}

export const DropZone = ({ onFileAccepted }: DropZoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (!acceptedFiles.length) return;

      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      onFileAccepted(file);
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <svg 
          className={`mx-auto h-12 w-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
          stroke="currentColor" 
          fill="none" 
          viewBox="0 0 48 48" 
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M24 8v24m0-24L16 16m8-8l8 8m-20 8h24" 
          />
        </svg>
        
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop the CSV file here...</p>
        ) : (
          <>
            <p className="text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">CSV file with email column (max 10MB)</p>
          </>
        )}
      </div>
    </div>
  );
};
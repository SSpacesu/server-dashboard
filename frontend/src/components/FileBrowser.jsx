import './FileBrowser.css'
import { useEffect, useState } from 'react'

const API_URL = `http://${window.location.hostname}:8000`
const getLocalFileKey = file => `${file.name}:${file.size}:${file.lastModified}`

const formatFileSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function FileBrowser() {
    const [currentPath, setCurrentPath] = useState('')
    const [folders, setFolders] = useState([])
    const [files, setFiles] = useState([])
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [uploadMessage, setUploadMessage] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState('')
    

    useEffect(() => {
        const loadFolders = async () => {
            try {
            setError('')

            const response = await fetch(
                `${API_URL}/api/folders?path=${encodeURIComponent(currentPath)}`
            )

            if (!response.ok) {
                throw new Error('Could not load this folder')
            }

            const data = await response.json()
            setFolders(data.folders)
            setFiles(data.files)
            } catch (requestError) {
            setError(requestError.message)
            }
        }

        loadFolders()
        }, [currentPath])

    
    const openFolder = folderName => {
        const nextPath = currentPath
            ? `${currentPath}/${folderName}`
            : folderName

        setCurrentPath(nextPath)
    }
        
    const goUp = () => {
        const pathParts = currentPath.split('/').filter(Boolean)
        pathParts.pop()
        setCurrentPath(pathParts.join('/'))
    }

    const pathParts = currentPath.split('/').filter(Boolean)

    const breadcrumbs = [
        { name: 'Shared', path: '' },
        ...pathParts.map((part, index) => ({
            name: part,
            path: pathParts.slice(0, index + 1).join('/'),
        })),
    ]

    const uploadSelectedFiles = async event => {
        event.preventDefault()
        const uploadForm = event.currentTarget

        if (selectedFiles.length === 0) {
            setUploadMessage('Choose at least one file')
            return
        }

        setUploading(true)
        setUploadMessage(`Uploading 0 of ${selectedFiles.length}...`)

        let uploadedCount = 0

        try {
            for (const selectedFile of selectedFiles) {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('folder', currentPath)

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                `${selectedFile.name}: ${result.detail || 'Upload failed'}`
                )
            }

            uploadedCount += 1

            setFiles(existingFiles =>
                [...existingFiles, result.stored_filename].sort((a, b) =>
                a.localeCompare(b)
                )
            )

            setUploadMessage(
                `Uploading ${uploadedCount} of ${selectedFiles.length}...`
            )
            }

            setUploadMessage(
            `Uploaded ${uploadedCount} ${
                uploadedCount === 1 ? 'file' : 'files'
            }`
            )

            setSelectedFiles([])
            uploadForm.reset()
        } catch (requestError) {
            setUploadMessage(
            `Uploaded ${uploadedCount} of ${selectedFiles.length}. ${requestError.message}`
            )
        } finally {
            setUploading(false)
        }
    }
    const selectLocalFiles = fileList => {
        const incomingFiles = Array.from(fileList ?? [])

        setSelectedFiles(existingFiles => {
            const knownKeys = new Set(
            existingFiles.map(file => getLocalFileKey(file))
            )

            const mergedFiles = [...existingFiles]

            for (const file of incomingFiles) {
            const key = getLocalFileKey(file)

            if (!knownKeys.has(key)) {
                knownKeys.add(key)
                mergedFiles.push(file)
            }
            }

            return mergedFiles
        })

        setUploadMessage('')
    }

    const handleDrop = event => {
    event.preventDefault()
    setIsDragging(false)
    selectLocalFiles(event.dataTransfer.files)
    }
    
    const removeSelectedFile = fileToRemove => {
        const keyToRemove = getLocalFileKey(fileToRemove)

        setSelectedFiles(existingFiles =>
            existingFiles.filter(
                file => getLocalFileKey(file) !== keyToRemove
            )
        )
    }   

    return (
    <section className="file-browser">
        <h1>Storage</h1>

        <nav aria-label="Folder path">
            {breadcrumbs.map((breadcrumb, index) => (
                <span key={breadcrumb.path || 'root'}>
                    {index > 0 && ' / '}

                    <button
                        type="button"
                        onClick={() => setCurrentPath(breadcrumb.path)}
                        disabled={breadcrumb.path === currentPath}
                    >
                        {breadcrumb.name}
                    </button>
                </span>
            ))}
        </nav>

        {error && <p className="error-message">{error}</p>}

        <ul>
            {folders.map(folder => (
                <li key={folder}>
                    <button type="button" onClick={() => openFolder(folder)}>
                        📁 {folder}
                    </button>
                </li>
            ))}
        </ul>
        

        <h2>Files <button
            style={{ float: 'right' }}
            type="button"
            onClick={goUp}
            disabled={!currentPath}
        >
        Back
        </button></h2>

        {files.length === 0 ? (
        <p>No files in this folder.</p>
        ) : (
        <ul>
           {files.map(fileName => {
            const filePath = currentPath
                ? `${currentPath}/${fileName}`
                : fileName

            const fileUrl =
                `${API_URL}/api/file?path=${encodeURIComponent(filePath)}`

            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)

            return (
                <li key={fileName}>
                {isImage ? (
                    <>
                    <img
                        src={fileUrl}
                        alt={fileName}
                        width="180"
                        loading="lazy"
                    />
                    <div>{fileName}</div>
                    </>
                ) : (
                    <div>📄 {fileName}</div>
                )}

                <a href={`${fileUrl}&download=true`}>
                    Download
                </a>
                </li>
            )
            })}
        </ul>
        )}
        

        <form className="upload-panel" onSubmit={uploadSelectedFiles}>
            <h2>Upload a file</h2>

            <label
                className={`file-drop-zone ${
                    isDragging ? 'file-drop-zone--active' : ''
                }`}
                onDragEnter={event => {
                    event.preventDefault()
                    setIsDragging(true)
                }}
                onDragOver={event => {
                    event.preventDefault()
                    setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                >
                <input
                    className="file-drop-zone__input"
                    type="file"
                    multiple
                    onChange={event => selectLocalFiles(event.target.files)}
                />

                <span className="file-drop-zone__icon" aria-hidden="true">
                    ↑
                </span>

                <strong>Drop files here</strong>
                <span>or click to choose files from your computer</span>
            </label>

            {selectedFiles.length > 0 && (
                <section className="upload-queue">
                    <div className="upload-queue__header">
                    <strong>
                        {selectedFiles.length}{' '}
                        {selectedFiles.length === 1 ? 'file' : 'files'} selected
                    </strong>

                    <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                    >
                        Clear all
                    </button>
                    </div>

                    <ul className="upload-queue__list">
                    {selectedFiles.map(file => (
                        <li key={getLocalFileKey(file)}>
                        <div>
                            <strong>{file.name}</strong>
                            <span>{formatFileSize(file.size)}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => removeSelectedFile(file)}
                            aria-label={`Remove ${file.name}`}
                        >
                            Remove
                        </button>
                        </li>
                    ))}
                    </ul>
                </section>
                )}
            <button
                type="submit"
                disabled={selectedFiles.length === 0 || uploading}

            >
                {uploading ? 'Uploading...' : 'Upload'}
            </button>

            {uploadMessage && (
                <p>{uploadMessage}</p>
                )}
        </form>


    </section>
    )


}

export default FileBrowser
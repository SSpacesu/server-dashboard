import './FileBrowser.css'
import { useEffect, useRef, useState } from 'react'

//const API_URL = `http://${window.location.hostname}:8000` not used by nginx
const getLocalFileKey = file => `${file.name}:${file.size}:${file.lastModified}`

const formatFileSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

const formatUploadSpeed = bytesPerSecond => {
    if (!bytesPerSecond) return 'Starting...'
    if (bytesPerSecond < 1024 ** 2) {
        return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    }

    return `${(bytesPerSecond / 1024 ** 2).toFixed(1)} MB/s`
}

function FileBrowser() {
    const [currentPath, setCurrentPath] = useState('')
    const [folders, setFolders] = useState([])
    const [files, setFiles] = useState([])
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [uploadMessage, setUploadMessage] = useState('')
    const [uploadProgress, setUploadProgress] = useState({})
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState('')
    const uploadRequests = useRef(new Map())
    const cancelledUploadKeys = useRef(new Set())
    const uploadSamples = useRef(new Map())
    

    useEffect(() => {
        const loadFolders = async () => {
            try {
            setError('')

            const response = await fetch(
                `/api/folders?path=${encodeURIComponent(currentPath)}`
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

        const interval = setInterval(loadFolders, 5000)

        return () => clearInterval(interval)
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
        setUploadProgress(
            Object.fromEntries(
                selectedFiles.map(file => [getLocalFileKey(file), {
                    status: 'queued',
                    percent: 0,
                    speed: 0,
                }])
            )
        )
        cancelledUploadKeys.current.clear()
        uploadSamples.current.clear()

        let uploadedCount = 0
        let currentFile = null

        try {
            for (const selectedFile of selectedFiles) {
            const fileKey = getLocalFileKey(selectedFile)
            if (cancelledUploadKeys.current.has(fileKey)) continue

            currentFile = selectedFile
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('folder', currentPath)

            let result

            try {
                result = await new Promise((resolve, reject) => {
                    const request = new XMLHttpRequest()
                    uploadRequests.current.set(fileKey, request)
                    uploadSamples.current.set(fileKey, [])

                    setUploadProgress(progress => ({
                        ...progress,
                        [fileKey]: { status: 'uploading', percent: 0, speed: 0 },
                    }))

                    request.upload.addEventListener('progress', progressEvent => {
                        if (!progressEvent.lengthComputable) return

                        const now = performance.now()
                        const samples = uploadSamples.current.get(fileKey) || []
                        samples.push({ time: now, loaded: progressEvent.loaded })

                        while (samples.length > 1 && now - samples[0].time > 3000) {
                            samples.shift()
                        }

                        const oldestSample = samples[0]
                        const elapsedSeconds = (now - oldestSample.time) / 1000
                        const speed = elapsedSeconds > 0
                            ? (progressEvent.loaded - oldestSample.loaded) / elapsedSeconds
                            : 0

                        setUploadProgress(progress => ({
                            ...progress,
                            [fileKey]: {
                                status: 'uploading',
                                percent: Math.round(
                                    (progressEvent.loaded / progressEvent.total) * 100
                                ),
                                speed,
                            },
                        }))
                    })

                    request.addEventListener('load', () => {
                        uploadRequests.current.delete(fileKey)
                        const responseBody = (() => {
                            try {
                                return JSON.parse(request.responseText)
                            } catch {
                                return {}
                            }
                        })()

                        if (request.status < 200 || request.status >= 300) {
                            reject(new Error(
                                `${selectedFile.name}: ${responseBody.detail || 'Upload failed'}`
                            ))
                            return
                        }

                        resolve(responseBody)
                    })

                    request.addEventListener('abort', () => {
                        uploadRequests.current.delete(fileKey)
                        const cancellationError = new Error('Upload cancelled')
                        cancellationError.code = 'UPLOAD_CANCELLED'
                        reject(cancellationError)
                    })

                    request.addEventListener('error', () => {
                        uploadRequests.current.delete(fileKey)
                        reject(new Error(`${selectedFile.name}: Upload connection failed`))
                    })

                    request.open('POST', `/api/upload`)
                    request.send(formData)
                })
            } catch (requestError) {
                if (requestError.code === 'UPLOAD_CANCELLED') continue
                throw requestError
            }

            uploadedCount += 1

            setUploadProgress(progress => ({
                ...progress,
                [fileKey]: { status: 'complete', percent: 100, speed: progress[fileKey]?.speed || 0 },
            }))

            setFiles(existingFiles =>
                [...existingFiles, result.stored_filename].sort((a, b) =>
                a.localeCompare(b)
                )
            )
            currentFile = null

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
            const failedFile = currentFile

            if (failedFile) {
                setUploadProgress(progress => ({
                    ...progress,
                    [getLocalFileKey(failedFile)]: {
                        ...progress[getLocalFileKey(failedFile)],
                        status: 'error',
                    },
                }))
            }

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
        cancelledUploadKeys.current.add(keyToRemove)
        uploadRequests.current.get(keyToRemove)?.abort()

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
        <h2>Folders</h2>
        <ul className="folder-list">
            {folders.map(folder => (
                <li key={folder}>
                    <button type="button" onClick={() => openFolder(folder)}>
                        📁 {folder}
                    </button>
                </li>
            ))}
        </ul>
        

        <h2>Files 
            {/*<button
            style={{ float: 'right' }}
            type="button"
            onClick={goUp}
            disabled={!currentPath}
        >
        Back
        </button>*/}</h2>

        {files.length === 0 ? (
        <p>No files in this folder.</p>
        ) : (
        <ul className="file-list">
           {files.map(fileName => {
            const filePath = currentPath
                ? `${currentPath}/${fileName}`
                : fileName

            const fileUrl =
                `/api/file?path=${encodeURIComponent(filePath)}`

            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)
            const isVideo = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(fileName)

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
                ) : isVideo ? (
                    <>
                    <video
                        className="file-preview-video"
                        src={fileUrl}
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={fileName}
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
                        <li
                            key={getLocalFileKey(file)}
                            className={`upload-queue__item upload-queue__item--${
                                uploadProgress[getLocalFileKey(file)]?.status || 'queued'
                            }`}
                        >
                        <div>
                            <strong>{file.name}</strong>
                            <span>
                                {uploadProgress[getLocalFileKey(file)]?.status === 'complete'
                                    ? 'Uploaded'
                                    : uploadProgress[getLocalFileKey(file)]?.status === 'error'
                                        ? 'Upload failed'
                                        : `${formatFileSize(file.size)}${
                                            uploadProgress[getLocalFileKey(file)]?.status === 'uploading'
                                                ? ` - ${formatUploadSpeed(uploadProgress[getLocalFileKey(file)].speed)}`
                                                : ''
                                        }`}
                            </span>
                        </div>

                        <div className="upload-queue__progress">
                            <div
                                className="upload-queue__progress-bar"
                                style={{
                                    width: `${uploadProgress[getLocalFileKey(file)]?.percent || 0}%`,
                                }}
                            />
                        </div>

                        <span className="upload-queue__percent">
                            {uploadProgress[getLocalFileKey(file)]?.percent || 0}%
                        </span>

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
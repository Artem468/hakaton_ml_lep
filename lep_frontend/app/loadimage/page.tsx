"use client";

import React, {useState, useRef, useEffect} from "react";
import {withAuth} from "@/app/hoc/withAuth";
import {apiFetch} from "@/app/api/api";
import {FiEye, FiUpload, FiPlus, FiTrash2} from "react-icons/fi";
import * as exifr from "exifr";
import toast from "react-hot-toast";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import Header from "@/app/component/Header";

interface UploadedFile {
    id: string;
    file: File;
    preview: string;
    latitude: string;
    longitude: string;
}

interface InitBatchResponse {
    batch_id: number;
    files: {
        image_id: number;
        file_key: string;
        upload_url: string;
    }[];
}

interface AIModel {
    id: number;
    name: string;
}

function LoadImage() {
    const [projectName, setProjectName] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "confirming">("idle");
    const [globalProgress, setGlobalProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [models, setModels] = useState<AIModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
    const [modelsLoading, setModelsLoading] = useState(true);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setModelsLoading(true);
                const response = await apiFetch<AIModel[]>("vision/models/");
                setModels(response);
                if (response.length > 0) {
                    setSelectedModelId(response[0].id);
                }
            } catch (error) {
                console.error("Ошибка при загрузке моделей:", error);
                toast.error("Не удалось загрузить список нейросетей");
            } finally {
                setModelsLoading(false);
            }
        };

        fetchModels();
    }, []);

    const handleFiles = async (selectedFiles: FileList) => {
        const newFiles: UploadedFile[] = [];

        for (const file of Array.from(selectedFiles)) {
            if (!file.type.startsWith("image/")) continue;

            const preview = URL.createObjectURL(file);
            let latitude = "0";
            let longitude = "0";

            try {
                const gps = await exifr.gps(file);
                if (gps?.latitude && gps?.longitude) {
                    latitude = String(gps.latitude);
                    longitude = String(gps.longitude);
                }
            } catch {
            }

            newFiles.push({
                id: crypto.randomUUID(),
                file,
                preview,
                latitude,
                longitude,
            });
        }

        setFiles((prev) => [...prev, ...newFiles]);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    const handleImageClick = (fileId: string, index: number, event: React.MouseEvent) => {
        const newSelected = new Set(selectedFiles);

        if (event.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);

            for (let i = start; i <= end; i++) {
                newSelected.add(files[i].id);
            }
        } else if (event.ctrlKey || event.metaKey) {
            if (newSelected.has(fileId)) {
                newSelected.delete(fileId);
            } else {
                newSelected.add(fileId);
            }
        } else {
            newSelected.clear();
            newSelected.add(fileId);
        }

        setSelectedFiles(newSelected);
        setLastSelectedIndex(index);
    };

    const removeFile = (fileName: string) => {
        setFiles((prev) => prev.filter((f) => f.file.name !== fileName));
        setUploadProgress((prev) => {
            const copy = {...prev};
            delete copy[fileName];
            return copy;
        });
    };

    const removeSelectedFiles = () => {
        if (selectedFiles.size === 0) {
            toast.error("Выберите фотографии для удаления");
            return;
        }

        const filesToRemove = files.filter((f) => selectedFiles.has(f.id));
        filesToRemove.forEach((f) => URL.revokeObjectURL(f.preview));

        setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)));
        setSelectedFiles(new Set());
        setLastSelectedIndex(null);
        toast.success(`Удалено фотографий: ${filesToRemove.length}`);
    };

    const removeAllFiles = () => {
        files.forEach((f) => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setUploadProgress({});
        setGlobalProgress(0);
        setSelectedFiles(new Set());
        setLastSelectedIndex(null);
    };

    const selectAll = () => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map((f) => f.id)));
        }
    };

    const handleUpload = async () => {
        if (isUploading) return;
        if (!projectName || files.length === 0) {
            toast.error("Пожалуйста, введите название проекта и добавьте фото");
            return;
        }
        if (selectedModelId === null) {
            toast.error("Пожалуйста, выберите модель нейросети");
            return;
        }

        setIsUploading(true);
        setUploadStage("uploading");
        setCurrentFileIndex(0);

        try {
            const initRes = await apiFetch<InitBatchResponse>("vision/batches/init/", {
                method: "POST",
                body: JSON.stringify({
                    batch_name: projectName,
                    files: files.map((f) => ({
                        filename: f.file.name,
                        latitude: f.latitude,
                        longitude: f.longitude,
                    })),
                }),
            });

            const batchId = initRes.batch_id;
            const uploadFiles = initRes.files;
            const totalFiles = files.length;

            for (let i = 0; i < files.length; i++) {
                setCurrentFileIndex(i + 1);
                const file = files[i];
                const uploadInfo = uploadFiles[i];
                const uploadUrl = uploadInfo.upload_url;

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", uploadUrl);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const filePercent = Math.round((event.loaded * 100) / event.total);
                            setUploadProgress((prev) => ({
                                ...prev,
                                [file.file.name]: filePercent
                            }));

                            const completedFiles = i;
                            const currentFileProgress = filePercent / 100;
                            const overallProgress = ((completedFiles + currentFileProgress) / totalFiles) * 100;
                            setGlobalProgress(Math.round(overallProgress));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            setUploadProgress((prev) => ({
                                ...prev,
                                [file.file.name]: 100
                            }));
                            resolve();
                        } else {
                            reject(new Error(`Ошибка загрузки: ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error("Ошибка сети при загрузке файла"));
                    xhr.send(file.file);
                });
            }

            setGlobalProgress(100);
            setUploadStage("confirming");

            await apiFetch("vision/batches/confirm/", {
                method: "POST",
                body: JSON.stringify({batch_id: batchId, model_id: selectedModelId}),
            });

            setUploadStage("idle");
            toast.success("Проект успешно загружен и отправлен на анализ!");
            setFiles([]);
            setUploadProgress({});
            setProjectName("");
            setGlobalProgress(0);
            setCurrentFileIndex(0);
            setSelectedFiles(new Set());
        } catch (error) {
            console.error("Ошибка при загрузке проекта:", error);
            toast.error("Ошибка при загрузке проекта");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-64 md:size-96 bottom-0 opacity-50"
            />
            <Header/>

            <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 z-20 mt-4 md:mt-6">
                <div className="bg-[#1A1A25] p-4 sm:p-6 rounded-2xl mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#119BD7] mb-4 sm:mb-6">
                            Создать проект
                        </h1>
                    </div>

                    <input
                        type="text"
                        placeholder="Введите название проекта"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-[#11111A] border text-[#919191] border-[#919191] rounded px-4 py-2 sm:py-3 w-full mb-4 sm:mb-6 focus:outline-none focus:ring-2 focus:ring-[#119BD7] text-sm sm:text-base"
                    />

                    <div className="mb-4 sm:mb-6">
                        <label className="block text-[#119BD7] font-medium mb-2 text-sm sm:text-base">
                            Выберите модель нейросети
                        </label>
                        {modelsLoading ? (
                            <div className="bg-[#11111A] border border-[#919191] rounded px-4 py-2 sm:py-3 w-full text-[#919191] text-sm sm:text-base">
                                Загрузка моделей...
                            </div>
                        ) : models.length === 0 ? (
                            <div className="bg-[#11111A] border border-red-500 rounded px-4 py-2 sm:py-3 w-full text-red-500 text-sm sm:text-base">
                                Не удалось загрузить модели
                            </div>
                        ) : (
                            <select
                                value={selectedModelId ?? ""}
                                onChange={(e) => setSelectedModelId(Number(e.target.value))}
                                className="bg-[#11111A] border text-[#919191] border-[#919191] rounded px-4 py-2 sm:py-3 w-full focus:outline-none focus:ring-2 focus:ring-[#119BD7] text-sm sm:text-base"
                            >
                                {models.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="bg-[#1A1A25] rounded-lg  p-4 sm:p-6"
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <h2 className="font-semibold text-[#119BD7] text-base sm:text-lg">
                                Загруженные фото
                            </h2>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {files.length > 0 && !isUploading && (
                                    <>
                                        <button
                                            onClick={selectAll}
                                            className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm border border-[#119BD7] text-[#119BD7] rounded-lg transition-colors hover:bg-[#119BD7] hover:text-white"
                                        >
                                            {selectedFiles.size === files.length ? "Снять выбор" : "Выбрать все"}
                                        </button>
                                        <button
                                            onClick={removeSelectedFiles}
                                            disabled={selectedFiles.size === 0}
                                            className={`flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm border rounded-lg flex items-center justify-center gap-2 ${
                                                selectedFiles.size === 0
                                                    ? "border-gray-600 text-gray-600 cursor-not-allowed"
                                                    : "border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                            }`}
                                        >
                                            <FiTrash2 size={14}/>
                                            <span className="hidden sm:inline">Удалить</span>
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-10 h-10 sm:w-8 sm:h-8 border border-[#119BD7] text-[#119BD7] rounded-full flex items-center justify-center hover:bg-[#119BD7] hover:text-white transition-colors flex-shrink-0"
                                >
                                    <FiPlus size={16}/>
                                </button>
                            </div>
                        </div>

                        {files.length === 0 && !isUploading && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-dashed border-2 border-[#119BD7] rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-[#0d8fc7] transition-colors"
                            >
                                <div className="w-12 h-12 border-[#119BD7] bg-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiUpload size={20} className="text-[#119BD7]"/>
                                </div>
                                <p className="text-[#119BD7] font-medium mb-1 text-sm sm:text-base">
                                    Выберите фотографии
                                </p>
                                <p className="text-gray-500 text-xs sm:text-sm mb-1">
                                    или перетащите в область
                                </p>
                                <p className="text-gray-400 text-xs">
                                    неограниченное количество фотографий
                                </p>
                            </div>
                        )}

                        {uploadStage === "uploading" && (
                            <div className="border-dashed border-2 border-[#119BD7] rounded-lg p-6 sm:p-8 text-center">
                                <p className="text-[#119BD7] font-medium mb-1 text-sm sm:text-base">
                                    Загрузка файлов... ({currentFileIndex} из {files.length})
                                </p>
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-[#119BD7] h-2 rounded-full transition-all duration-300"
                                        style={{width: `${globalProgress}%`}}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{globalProgress}%</p>
                            </div>
                        )}

                        {uploadStage === "confirming" && (
                            <div className="border-dashed border-2 border-[#119BD7] rounded-lg p-6 sm:p-8 text-center">
                                <p className="text-[#119BD7] font-medium mb-1 text-sm sm:text-base">
                                    Подтверждение загрузки...
                                </p>
                                <div className="mt-4 flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#119BD7]"></div>
                                </div>
                            </div>
                        )}

                        {files.length > 0 && !isUploading && (
                            <div className="mb-4">
                                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                                    Загружено: {files.length} фото
                                    {selectedFiles.size > 0 && ` | Выбрано: ${selectedFiles.size}`}
                                </p>
                                <p className="text-xs text-gray-400 mb-3 hidden sm:block">
                                    Совет: Удерживайте Shift для выбора диапазона, Ctrl/Cmd для множественного выбора
                                </p>
                                <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 auto-rows-[minmax(100px,auto)]">
                                        {files.map((f, index) => (
                                            <div
                                                key={f.id}
                                                onClick={(e) => handleImageClick(f.id, index, e)}
                                                className={`relative group overflow-hidden rounded border cursor-pointer w-full aspect-square transition-all ${
                                                    selectedFiles.has(f.id)
                                                        ? "border-[#119BD7] ring-2 ring-[#119BD7] scale-95"
                                                        : "border-gray-200 hover:border-[#119BD7]"
                                                }`}
                                            >
                                                <img
                                                    src={f.preview}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                    alt={`Preview ${index + 1}`}
                                                />
                                                {selectedFiles.has(f.id) && (
                                                    <div className="absolute bottom-1 left-1 z-10">
                                                        <div className="w-5 h-5 sm:w-7 sm:h-7 bg-[#119BD7] rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={3} d="M5 13l4 4L19 7"/>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(f.file.name);
                                                    }}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || files.length === 0 || selectedModelId === null}
                                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-[#119BD7] text-[#119BD7] font-medium flex items-center justify-center gap-2 text-sm sm:text-base ${
                                    isUploading || files.length === 0 || selectedModelId === null
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-[#119BD7] hover:text-white transition-colors"
                                }`}
                            >
                                <span>Запустить анализ</span>
                            </button>

                            {files.length > 0 && !isUploading && (
                                <button
                                    onClick={removeAllFiles}
                                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-red-500 text-red-500 font-medium hover:bg-red-500 hover:text-white transition-colors text-sm sm:text-base"
                                >
                                    Очистить всё
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
        </div>
    );
}

export default withAuth(LoadImage);

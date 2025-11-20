"use client";

import React, {useState, useRef, useEffect} from "react";
import {withAuth} from "@/app/hoc/withAuth";
import {apiFetch} from "@/app/lib/api";
import {FiEye, FiUpload, FiPlus} from "react-icons/fi";
import * as exifr from "exifr";
import Link from "next/link";
import toast from "react-hot-toast";

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

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

function LoadImage() {
    const [projectName, setProjectName] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "confirming">("idle");

    const [globalProgress, setGlobalProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user: User = JSON.parse(userStr);
                setCurrentUser(user);
            }
        } catch {
        }
    }, []);

    const recalcGlobalProgress = (next: Record<string, number>) => {
        const values = Object.values(next);
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.min(100, Math.round(avg));
    };

    const handleFiles = async (selectedFiles: FileList) => {
        const newFiles: UploadedFile[] = [];

        for (const file of Array.from(selectedFiles)) {
            if (!file.type.startsWith("image/")) continue;
            if (files.length + newFiles.length >= 100) break;

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

    const removeFile = (fileName: string) => {
        setFiles((prev) => prev.filter((f) => f.file.name !== fileName));
        setUploadProgress((prev) => {
            const copy = {...prev};
            delete copy[fileName];
            setGlobalProgress(recalcGlobalProgress(copy));
            return copy;
        });
    };

    const handleUpload = async () => {
        if (isUploading) return;
        if (!projectName || files.length === 0) {
            toast.error("Пожалуйста, введите название проекта и добавьте фото");
            return;
        }

        setIsUploading(true);
        setUploadStage("uploading");

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

            setUploadProgress({});
            setGlobalProgress(0);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const uploadInfo = uploadFiles[i];
                const uploadUrl = uploadInfo.upload_url;

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", uploadUrl);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percent = Math.round((event.loaded * 100) / event.total);
                            setUploadProgress((prev) => {
                                const next = {...prev, [file.file.name]: percent};
                                setGlobalProgress(recalcGlobalProgress(next));
                                return next;
                            });
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve();
                        } else {
                            reject(new Error(`Ошибка загрузки: ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error("Ошибка сети при загрузке файла"));
                    };

                    xhr.send(file.file);
                });
            }


            setUploadStage("confirming");

            await apiFetch("vision/batches/confirm/", {
                method: "POST",
                body: JSON.stringify({batch_id: batchId, model_id: 1}),
            });

            setUploadStage("idle");

            toast.success("Проект успешно загружен и отправлен на анализ!");
            setFiles([]);
            setUploadProgress({});
            setProjectName("");
            setGlobalProgress(0);
        } catch (error) {
            console.error("Ошибка при загрузке проекта:", error);
            toast.error("Ошибка при загрузке проекта");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full mx-auto bg-gray-100 min-h-screen flex flex-col items-center">
            <header className="flex justify-end items-center w-full bg-white p-4 border-b border-gray-200 mb-6">
                <Link href={"/profile"}>
                    <div className="flex items-center gap-3">
                        {currentUser ? (
                            <>
              <span className="text-sm font-medium text-gray-700">
                {currentUser.first_name} {currentUser.last_name}
              </span>
                                <div
                                    className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {currentUser.first_name[0]}
                                    {currentUser.last_name[0]}
                                </div>
                            </>
                        ) : (
                            <span className="text-gray-500 text-sm">Загрузка...</span>
                        )}
                    </div>
                </Link>
            </header>

            <div className="w-4/5">
                <div className="bg-white p-6 rounded-lg mb-6">
                    <div className="text-sm text-gray-500 mb-2">
                        <Link href={"/loadimage"}>Главная</Link> / <Link href={"/allproject"}>Все проекты</Link>
                    </div>
                    <h1 className="text-2xl font-bold text-orange-500 mb-6">Создать проект</h1>

                    <input
                        type="text"
                        placeholder="Введите название проекта"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="border border-gray-300 rounded px-4 py-2 w-full mb-6 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />

                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="bg-white rounded-lg border border-gray-300 p-6"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold">Загруженные фото</h2>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-8 h-8 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors"
                            >
                                <FiPlus size={16}/>
                            </button>
                        </div>

                        {files.length === 0 && !isUploading && (
                            <div
                                className="border-dashed border-2 border-orange-400 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 transition-colors">
                                <div
                                    className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiUpload size={24} className="text-orange-500"/>
                                </div>
                                <p className="text-orange-500 font-medium mb-1">Выберите фотографии</p>
                                <p className="text-gray-500 text-sm mb-1">или перетащите в область</p>
                                <p className="text-gray-400 text-xs">максимум 100 фотографий*</p>
                            </div>
                        )}

                        {uploadStage === "uploading" && (
                            <div className="border-dashed border-2 border-orange-400 rounded-lg p-8 text-center">
                                <p className="text-orange-500 font-medium mb-1">Загрузка файлов...</p>
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{width: `${globalProgress}%`}}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{globalProgress}%</p>
                            </div>
                        )}

                        {files.length > 0 && !isUploading && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-500 mb-2">Загружено: {files.length} фото</p>
                                <div
                                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 auto-rows-[minmax(100px,auto)]">
                                    {files.map((f, index) => (
                                        <div
                                            key={f.id}
                                            className="relative group overflow-hidden rounded border border-gray-200 bg-white flex items-center justify-center w-full aspect-square"
                                        >
                                            <img
                                                src={f.preview}
                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                alt={`Preview ${index + 1}`}
                                            />

                                            <button
                                                onClick={() => removeFile(f.file.name)}
                                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-4">
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || files.length === 0}
                                className={`px-6 py-2 rounded-full border border-orange-400 text-orange-500 font-medium flex items-center gap-2 ${
                                    isUploading || files.length === 0
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-orange-50 transition-colors"
                                }`}
                            >
                                <span>Запустить анализ</span>
                                <FiEye size={18}/>
                            </button>
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
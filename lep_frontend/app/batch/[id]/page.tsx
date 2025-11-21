"use client";

import React, {useEffect, useState, useRef} from "react";
import Image from "next/image";
import {apiFetch, BASE_MINI} from "@/app/api/api";
import backImage from "@/app/assets/backimage.svg";
import logo from "@/app/assets/logo.svg";
import Link from "next/link";
import {useParams, useSearchParams} from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Header from "@/app/component/Header";

interface DetectionObject {
    class: string;
    confidence: number;
}

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

interface BatchItem {
    id: number;
    file_key: string;
    preview: string | null;
    result: string | null;
    latitude: string;
    longitude: string;
    uploaded_at: string | null;
    damages: DetectionObject[];
    objects: DetectionObject[];
}

interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: BatchItem[];
}

interface BatchStatus {
    id: number;
    name: string;
    uploaded_at: string;
    processing_status: "not_processed" | "processing" | "completed" | "reviewed";
}

type StatusStep = {
    key: "not_processed" | "processing" | "completed" | "reviewed";
    label: string;
};

const STATUS_STEPS: StatusStep[] = [
    {key: "not_processed", label: "Создан"},
    {key: "processing", label: "В процессе"},
    {key: "completed", label: "Обработан"},
    {key: "reviewed", label: "Проверен"},
];

const TABLE_PAGE_SIZE = 30;

export default function ProjectPage() {
    const {id} = useParams();
    const [project, setProject] = useState<ApiResponse | null>(null);
    const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [tablePage, setTablePage] = useState(1);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== "undefined") {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch (error) {
                    console.error("Ошибка при загрузке пользователя:", error);
                    return null;
                }
            }
        }
        return null;
    });
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markers = useRef<maplibregl.Marker[]>([]);

    const searchParams = useSearchParams();
    const batchName = searchParams?.get("name") || "Без названия";

    const getBatchIdFromFileKey = (fileKey: string): string | null => {
        const match = fileKey.match(/batch_(\d+)\//);
        return match ? match[1] : null;
    };

    const filterPhotosByBatch = (photos: BatchItem[], batchId: string): BatchItem[] => {
        return photos.filter((photo) => {
            const photoBatchId = getBatchIdFromFileKey(photo.file_key);
            return photoBatchId === batchId;
        });
    };

    const loadAllPages = async (batchId: string): Promise<BatchItem[]> => {
        let allPhotos: BatchItem[] = [];
        let nextUrl: string | null = `vision/batches/${batchId}/`;

        while (nextUrl) {
            try {
                const url: string = nextUrl.startsWith('http')
                    ? nextUrl.replace(/^https?:\/\/[^\/]+\/api\//, '')
                    : nextUrl;

                const response: ApiResponse = await apiFetch<ApiResponse>(url, {method: "GET"});

                const filteredPhotos = filterPhotosByBatch(response.results, batchId);
                allPhotos = [...allPhotos, ...filteredPhotos];

                nextUrl = response.next;
            } catch (error) {
                console.error("Ошибка при загрузке страницы:", error);
                break;
            }
        }

        return allPhotos.sort((a, b) => a.id - b.id);
    };

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const statusData = await apiFetch<BatchStatus>(
                    `vision/batches/status/${id}/`,
                    {method: "GET"}
                );
                setBatchStatus(statusData);

                const allPhotos = await loadAllPages(id as string);

                setProject({
                    count: allPhotos.length,
                    next: null,
                    previous: null,
                    results: allPhotos,
                });
            } catch (err) {
                console.error("Ошибка при загрузке данных:", err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    useEffect(() => {
        if (!mapContainer.current || !project || map.current) return;

        const photos = project.results;
        const validPhotos = photos.filter((p) => {
            const lat = parseFloat(p.latitude);
            const lng = parseFloat(p.longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        if (validPhotos.length === 0) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        osm: {
                            type: "raster",
                            tiles: [
                                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            ],
                            tileSize: 256,
                            attribution:
                                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        },
                    },
                    layers: [
                        {
                            id: "osm",
                            type: "raster",
                            source: "osm",
                            minzoom: 0,
                            maxzoom: 19,
                        },
                    ],
                },
                center: [37.6173, 55.7558],
                zoom: 10,
            });

            map.current.addControl(new maplibregl.NavigationControl(), "top-right");
            return;
        }

        const avgLat =
            validPhotos.reduce((sum, p) => sum + parseFloat(p.latitude), 0) /
            validPhotos.length;
        const avgLng =
            validPhotos.reduce((sum, p) => sum + parseFloat(p.longitude), 0) /
            validPhotos.length;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
                        ],
                        tileSize: 256,
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    },
                },
                layers: [
                    {
                        id: "osm",
                        type: "raster",
                        source: "osm",
                        minzoom: 0,
                        maxzoom: 19,
                    },
                ],
            },
            center: [avgLng, avgLat],
            zoom: 13,
        });

        map.current.addControl(new maplibregl.NavigationControl(), "top-right");

        validPhotos.forEach((photo) => {
            const lat = parseFloat(photo.latitude);
            const lng = parseFloat(photo.longitude);

            const el = document.createElement("div");
            el.className = "custom-marker";
            el.style.width = "32px";
            el.style.height = "32px";
            el.style.borderRadius = "50%";
            el.style.cursor = "pointer";
            el.style.border = "3px solid white";
            el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
            el.style.transition = "transform 0.2s";

            if (photo.damages && photo.damages.length > 0) {
                el.style.backgroundColor = "#EF4444";
            } else {
                el.style.backgroundColor = "#10B981";
            }

            el.addEventListener("mouseenter", () => {
                el.style.transform = "scale(1.2)";
            });

            el.addEventListener("mouseleave", () => {
                el.style.transform = "scale(1)";
            });

            const marker = new maplibregl.Marker({element: el})
                .setLngLat([lng, lat])
                .addTo(map.current!);

            const popup = new maplibregl.Popup({
                offset: 25,
                closeButton: false,
                className: "custom-popup",
            }).setHTML(`
            <div style="color: #1a1a25; padding: 8px; font-family: system-ui;">
              <strong style="font-size: 14px;">Фото #${photos.indexOf(photo) + 1}</strong><br/>
              ${
                photo.damages && photo.damages.length > 0
                    ? `<span style="color: #EF4444; font-weight: 600;">⚠ Дефектов: ${photo.damages.length}</span>`
                    : '<span style="color: #10B981; font-weight: 600;">✓ Без дефектов</span>'
            }
            </div>
          `);

            marker.setPopup(popup);

            el.addEventListener("click", () => {
                setSelectedIndex(photos.indexOf(photo));
            });

            markers.current.push(marker);
        });

        return () => {
            markers.current.forEach((m) => m.remove());
            markers.current = [];
            map.current?.remove();
            map.current = null;
        };
    }, [project]);

    const getStatusIndex = (status: string): number => {
        const index = STATUS_STEPS.findIndex((step) => step.key === status);
        return index >= 0 ? index : 0;
    };

    const isStepActive = (stepIndex: number): boolean => {
        if (!batchStatus) return false;
        const currentStatusIndex = getStatusIndex(batchStatus.processing_status);
        return stepIndex <= currentStatusIndex;
    };

    const isStepCurrent = (stepIndex: number): boolean => {
        if (!batchStatus) return false;
        const currentStatusIndex = getStatusIndex(batchStatus.processing_status);
        return stepIndex === currentStatusIndex;
    };

    if (loading || !project || !batchStatus)
        return (
            <div className="bg-[#0F0F15] text-white p-6 min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#119BD7]"></div>
                    <span>Загрузка...</span>
                </div>
            </div>
        );

    const photos = project.results;
    const currentPhoto = photos[selectedIndex];
    const currentDamages = currentPhoto?.damages ?? [];
    const currentObjects = currentPhoto?.objects ?? [];
    const hasDefects = currentDamages.length > 0;
    const defectCount = photos.filter((item) => item.damages && item.damages.length > 0).length;

    const totalTablePages = Math.ceil(photos.length / TABLE_PAGE_SIZE);
    const paginatedPhotos = photos.slice(
        (tablePage - 1) * TABLE_PAGE_SIZE,
        tablePage * TABLE_PAGE_SIZE
    );

    const handleTableNextPage = () => {
        if (tablePage < totalTablePages) {
            setTablePage((prev) => prev + 1);
        }
    };

    const handleTablePreviousPage = () => {
        if (tablePage > 1) {
            setTablePage((prev) => prev - 1);
        }
    };

    const getTableItemNumber = (index: number) => {
        return (tablePage - 1) * TABLE_PAGE_SIZE + index + 1;
    };

    const CLASS_TRANSLATIONS: Record<string, string> = {
        vibration_damper: "Виброгаситель",
        festoon_insulators: "Гирлянда изоляторов",
        traverse: "Траверса",
        bad_insulator: "Поврежденный изолятор",
        damaged_insulator: "Дефектный изолятор",
        polymer_insulators: "Полимерные изоляторы",
        nest: "Гнездо",
        safety_sign: "Знак безопасности",
    };

    const getClassNameRu = (className: string): string => {
        return CLASS_TRANSLATIONS[className] || className;
    };
    const downloadImage = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);


            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Ошибка при скачивании файла:', error);
            alert('Не удалось скачать файл');
        }
    };
    const formatDateTime = (dateString: string | null): string => {
        if (!dateString) return "Не указана";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Не указана";
        const d = date.getDate().toString().padStart(2, "0");
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const y = date.getFullYear();
        const h = date.getHours().toString().padStart(2, "0");
        const min = date.getMinutes().toString().padStart(2, "0");
        return `${d}.${m}.${y} ${h}:${min}`;
    };


    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0 pointer-events-none"
            />
            <Header/>

            <div className="w-4/5 mt-6 z-20">
                <div className="bg-[#1A1A25] flex justify-between p-6 rounded-lg mb-6">
                    <div>
                        <div className="text-sm text-gray-500 mb-2">
                            <Link href="/loadimage" className="hover:text-gray-300 transition-colors">
                                Главная
                            </Link>{" "}
                            / {batchStatus.name}
                        </div>
                        <h1 className="text-2xl font-bold text-[#119BD7]">{batchStatus.name}</h1>
                        <p className="text-sm text-gray-400 mt-2">
                            Всего фотографий: {photos.length}
                        </p>
                    </div>

                    <div className="pt-4">
                        <div className="flex items-start">
                            <div
                                className="w-2 h-2 bg-[#119BD7] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <div className="flex-1">
                          <span className="text-gray-400 text-sm">
                            Статистика проекта:
                          </span>
                                <p className="text-white">
                                    Всего фотографий: {photos.length} | Дефектов:{" "}
                                    <span className="text-red-400 font-semibold">
                              {defectCount}
                            </span>{" "}
                                    | Без дефектов:{" "}
                                    <span className="text-green-400 font-semibold">
                              {photos.length - defectCount}
                            </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="bg-[#1A1A25] rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        {STATUS_STEPS.map((step, index) => (
                            <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center relative">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                            isStepActive(index)
                                                ? "bg-[#119BD7] border-[#119BD7]"
                                                : "bg-transparent border-gray-600"
                                        }`}
                                    >
                                        {isStepActive(index) && !isStepCurrent(index) ? (
                                            <svg
                                                className="w-5 h-5 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={3}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        ) : (
                                            <div
                                                className={`w-3 h-3 rounded-full ${
                                                    isStepActive(index) ? "bg-white" : "bg-gray-600"
                                                }`}
                                            />
                                        )}
                                    </div>
                                    <span
                                        className={`mt-2 text-sm font-medium whitespace-nowrap ${
                                            isStepActive(index) ? "text-[#119BD7]" : "text-gray-500"
                                        }`}
                                    >
                    {step.label}
                  </span>
                                </div>
                                {index < STATUS_STEPS.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-4 relative top-[-20px]">
                                        <div
                                            className={`h-full ${
                                                isStepActive(index + 1) ? "bg-[#119BD7]" : "bg-gray-600"
                                            }`}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="bg-[#1A1A25] rounded-xl z-20 overflow-hidden mb-6">
                    <div
                        ref={mapContainer}
                        className="relative h-[400px] w-full"
                        style={{minHeight: "400px"}}
                    />
                </div>

                <div className="bg-[#1A1A25] rounded-xl z-20 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Фотографии</h2>
                    <div
                        className="grid grid-cols-5 gap-3 overflow-y-auto pr-2"
                        style={{
                            maxHeight: photos.length > 30 ? "600px" : "none"
                        }}
                    >
                        {photos.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedIndex(index)}
                                className={`cursor-pointer border-2 rounded-lg overflow-hidden aspect-square relative transition-all ${
                                    index === selectedIndex
                                        ? "border-[#119BD7] ring-2 ring-[#119BD7]/50"
                                        : "border-gray-700 hover:border-gray-500"
                                }`}
                            >
                                <Image
                                    src={`${BASE_MINI}ml-media/${item.preview}`}
                                    alt="photo"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                {item.damages && item.damages.length > 0 && (
                                    <div
                                        className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                        Дефект
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {photos.length > 30 && (
                        <p className="text-sm text-gray-400 mt-3 text-center">
                            Прокрутите, чтобы увидеть все фотографии
                        </p>
                    )}
                </div>

                {currentPhoto && (
                    <div className="bg-[#1A1A25] rounded-xl p-6 mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-4">
                                <div className="rounded-lg overflow-hidden bg-[#11111A] p-3">
                                    <Image
                                        src={`${BASE_MINI}ml-media/${currentPhoto.preview}`}
                                        alt="Оригинал"
                                        width={400}
                                        height={300}
                                        unoptimized
                                        className="w-full h-auto object-cover rounded-lg"
                                    />
                                    <p className="text-sm text-gray-400 mt-2 text-center">Оригинал</p>
                                </div>
                                <div className="rounded-lg overflow-hidden bg-[#11111A] p-3">
                                    <Image
                                        src={`${BASE_MINI}ml-media/${currentPhoto.result}`}
                                        alt="С разметкой"
                                        width={400}
                                        height={300}
                                        unoptimized
                                        className="w-full h-auto object-cover rounded-lg"
                                    />
                                    <p className="text-sm text-gray-400 mt-2 text-center">
                                        С разметкой
                                    </p>
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4">
                                        Информация о фото #{selectedIndex + 1}
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start">
                                            <div
                                                className="w-2 h-2 bg-[#119BD7] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                            <div className="flex-1">
                                                <span className="text-gray-400 text-sm">Дата загрузки:</span>
                                                <p className="text-white">
                                                    {formatDateTime(currentPhoto.uploaded_at)}
                                                </p>
                                            </div>

                                        </div>

                                        <div className="flex items-start">
                                            <div
                                                className="w-2 h-2 bg-[#119BD7] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                            <div className="flex-1">
                                                <span className="text-gray-400 text-sm">Координаты:</span>
                                                <p className="text-white font-mono text-sm">
                                                    {currentPhoto.latitude && currentPhoto.longitude
                                                        ? `${parseFloat(currentPhoto.latitude).toFixed(6)}, ${parseFloat(
                                                            currentPhoto.longitude
                                                        ).toFixed(6)}`
                                                        : "Нет данных"}
                                                </p>
                                            </div>
                                        </div>

                                        {hasDefects ? (
                                            <>
                                                <div className="flex items-start">
                                                    <div
                                                        className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                    <div className="flex-1">
                                                        <span className="text-gray-400 text-sm">Статус:</span>
                                                        <p className="text-red-400 font-semibold">
                                                            Обнаружены дефекты ({currentDamages.length})
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start">
                                                    <div
                                                        className="w-2 h-2 bg-[#119BD7] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                    <div className="flex-1">
                                                        <span
                                                            className="text-gray-400 text-sm">Обнаруженные дефекты:</span>
                                                        <div className="mt-2 space-y-2">
                                                            {currentDamages.map((damage, idx) => (
                                                                <div key={idx} className="bg-[#11111A] p-2 rounded">
                                                                    <p className="text-white font-semibold">{getClassNameRu(damage.class)}</p>
                                                                    <p className="text-sm text-gray-400">
                                                                        Уверенность: {(damage.confidence * 100).toFixed(2)}%
                                                                    </p>
                                                                </div>
                                                            ))}

                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-start">
                                                <div
                                                    className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <div className="flex-1">
                                                    <span className="text-gray-400 text-sm">Статус:</span>
                                                    <p className="text-green-400 font-semibold">
                                                        Дефекты не обнаружены
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {currentObjects.length > 0 && (
                                            <div className="flex items-start">
                                                <div
                                                    className="w-2 h-2 bg-[#119BD7] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                <div className="flex-1">
                                                    <span className="text-gray-400 text-sm">Обнаруженные объекты:</span>
                                                    <div className="mt-2 space-y-2">
                                                        {currentObjects.map((obj, idx) => (
                                                            <div key={idx} className="bg-[#11111A] p-2 rounded">
                                                                <p className="text-white">{getClassNameRu(obj.class)}</p>
                                                                <p className="text-sm text-gray-400">
                                                                    Уверенность: {(obj.confidence * 100).toFixed(2)}%
                                                                </p>
                                                            </div>
                                                        ))}

                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => downloadImage(
                                                `${BASE_MINI}ml-media/${currentPhoto.file_key}`,
                                                `original_${selectedIndex + 1}.jpg`
                                            )}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#119BD7] hover:bg-[#1da9f0] text-white font-semibold rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                            </svg>
                                            Скачать оригинал
                                        </button>
                                        <button
                                            onClick={() => downloadImage(
                                                `${BASE_MINI}ml-media/${currentPhoto.result}`,
                                                `processed_${selectedIndex + 1}.jpg`
                                            )}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                            </svg>
                                            Скачать обработанное ИИ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-[#1A1A25] rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Детальная информация
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-gray-700">
                                <th className="py-3 px-4 text-left text-xs font-bold text-[#119BD7] uppercase">
                                    №
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-[#119BD7] uppercase">
                                    Фото
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-[#119BD7] uppercase">
                                    Ответ помощника
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-[#119BD7] uppercase">
                                    Координаты
                                </th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-[#119BD7] uppercase">
                                    Дата загрузки
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedPhotos.map((item, index) => {
                                const actualIndex = (tablePage - 1) * TABLE_PAGE_SIZE + index;
                                return (
                                    <tr
                                        key={item.id}
                                        className="border-b border-gray-800 hover:bg-[#29293D] transition-colors cursor-pointer"
                                        onClick={() => setSelectedIndex(actualIndex)}
                                    >
                                        <td className="py-4 px-4 text-gray-400 font-medium">
                                            {String(getTableItemNumber(index)).padStart(2, "0")}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="w-16 h-16 relative rounded-lg overflow-hidden">
                                                <Image
                                                    src={`${BASE_MINI}ml-media/${item.preview}`}
                                                    alt={`thumb-${index}`}
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {item.damages && item.damages.length > 0 ? (
                                                <div className="space-y-1">
                                                    {item.damages.map((damage, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 mr-1"
                                                        >
                            {getClassNameRu(damage.class)}
                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                          Без дефектов
                        </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-gray-400">
                                            {item.latitude && item.longitude ? (
                                                <span className="font-mono text-xs">
                          {parseFloat(item.latitude).toFixed(6)},{" "}
                                                    {parseFloat(item.longitude).toFixed(6)}
                        </span>
                                            ) : (
                                                <span className="text-gray-600">Нет данных</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-gray-400">
                                            {formatDateTime(currentPhoto.uploaded_at) || "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {photos.length > TABLE_PAGE_SIZE && (
                        <div className="mt-6 flex items-center justify-between p-4 border-t border-gray-700">
                            <div className="text-sm text-gray-400">
                                Показано {((tablePage - 1) * TABLE_PAGE_SIZE) + 1} - {Math.min(tablePage * TABLE_PAGE_SIZE, photos.length)} из {photos.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTablePreviousPage}
                                    disabled={tablePage === 1}
                                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        tablePage > 1
                                            ? "bg-[#119BD7] text-white hover:bg-[#1da9f0]"
                                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    ← Назад
                                </button>
                                <span className="px-4 py-2 text-[#119BD7] font-semibold">
                                    Страница {tablePage} из {totalTablePages}
                                </span>
                                <button
                                    onClick={handleTableNextPage}
                                    disabled={tablePage === totalTablePages}
                                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        tablePage < totalTablePages
                                            ? "bg-[#119BD7] text-white hover:bg-[#1da9f0]"
                                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    Вперед →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

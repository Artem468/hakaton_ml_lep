"use client";

import React, {useEffect, useState} from "react";
import Image from "next/image";
import {apiFetch} from "@/app/lib/api";
import dynamic from "next/dynamic";
import {LatLngExpression, Icon} from "leaflet";
import backImage from "@/app/assets/backimage.svg";
import logo from "@/app/assets/logo.svg";
import Link from "next/link";
import {useParams, useSearchParams} from "next/navigation";

const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), {ssr: false});
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), {ssr: false});
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), {ssr: false});
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), {ssr: false});

interface DetectionResult {
    id: number;
    defect_type: string;
    confidence: number;
    coordinates: { x: number; y: number; width: number; height: number; };
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
    latitude: string;
    longitude: string;
    created_at: string | null;
    detection_result: DetectionResult | null;
}

interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: BatchItem[];
}

const createCustomIcon = (hasDefect: boolean, index: number) => new Icon({
    iconUrl: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDMwIDMwIj48Y2lyY2xlIGN4PSIxNSIgY3k9IjE1IiByPSIxNCIgZmlsbD0iI0${hasDefect ? "DC2626" : "3B82F6"}Ii8+PHRleHQgeD0iMTUiIHk9IjE4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+JHtpbmRleH08L3RleHQ+PC9zdmc+`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

export default function ProjectPage() {
    const {id} = useParams();
    const [project, setProject] = useState<ApiResponse | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [mapCenter, setMapCenter] = useState<LatLngExpression>([59.9342, 30.3158]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const searchParams = useSearchParams();
    const batchName = searchParams?.get("name") || "Без названия";

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

    useEffect(() => {
        async function load() {
            try {
                const data = await apiFetch<ApiResponse>(`vision/batches/${id}/`, {method: "GET"});
                setProject(data);
                if (data.results.length > 0 && data.results[0].latitude && data.results[0].longitude) {
                    setMapCenter([parseFloat(data.results[0].latitude), parseFloat(data.results[0].longitude)]);
                }
            } catch (err) {
                console.error(err);
            }
        }

        load();
    }, [id]);

    if (!project) return <div className="bg-[#0F0F15] text-white p-6">Загрузка...</div>;

    const photos = project.results;
    const currentPhoto = photos[selectedIndex];
    const currentDetection = currentPhoto?.detection_result ?? null;
    const defectCount = photos.filter(item => item.detection_result).length;
    const currentLat = currentPhoto?.latitude ? parseFloat(currentPhoto.latitude) : null;
    const currentLng = currentPhoto?.longitude ? parseFloat(currentPhoto.longitude) : null;

    return (
        <div className="bg-[#0F0F15] flex flex-col items-center text-white min-h-screen ">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0"
            />
            <Image
                src={logo}
                alt=""
                className="absolute left-4 z-0 size-16 top-4"
            />
            <header
                className="flex justify-end items-center w-full bg-[#11111A] py-8 p-4 border-b border-gray-200 mb-6">
                <div className="text-[#CACACA] w-9/12 flex justify-center gap-15">
                    <Link href="/loadimage">Создать проект</Link>
                    <Link href="/allproject">Все проекты</Link>
                    <Link href="/stats">Статистика</Link>
                </div>

                <Link href={"/profile"}>
                    <div className="flex items-center gap-3">
                        {currentUser ? (
                            <>

              <span className="text-sm font-medium text-[#CACACA]">
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
           <div className="w-5/6">
                <div className="text-sm text-gray-400 mb-2">Главная / {batchName}</div>
            <div className="bg-[#1A1A25] p-4 z-20 rounded-lg mb-6">
                <h1 className="text-xl font-bold">{batchName}</h1>
            </div>

            <div className="flex items-center gap-4 z-20 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Создан</span></div>
                <div className="w-px h-4 bg-gray-600"></div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">В процессе</span></div>
                <div className="w-px h-4 bg-gray-600"></div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Обработка</span></div>
                <div className="w-px h-4 bg-gray-600"></div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Завершен</span></div>
            </div>

            <div className="bg-[#1A1A25] rounded-xl z-20 overflow-hidden mb-6">
                <div className="relative h-[400px] z-20 w-full">
                    {typeof window !== "undefined" && (
                        <MapContainer center={mapCenter} zoom={1} style={{height: "100%", width: "100%"}}
                                      className="rounded-xl">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                            {photos.map((item, index) => {
                                if (!item.latitude || !item.longitude) return null;
                                const lat = parseFloat(item.latitude);
                                const lng = parseFloat(item.longitude);
                                const hasDefect = !!item.detection_result;
                                return (
                                    <Marker key={item.id} position={[lat, lng]}
                                            icon={createCustomIcon(hasDefect, index + 1)}>
                                        <Popup>
                                            <div className="p-2">
                                                <p className="font-bold">Фото {index + 1}</p>
                                                {hasDefect &&
                                                    <p className="text-red-400">Дефект: {item.detection_result?.defect_type}</p>}
                                                <p>Координаты: {lat.toFixed(6)}, {lng.toFixed(6)}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    )}
                </div>
            </div>

            <div className="bg-[#1A1A25] rounded-xl z-20 p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Фотографии</h2>
                <div className="grid grid-cols-6 gap-3">
                    {photos.map((item, index) => (
                        <div key={item.id} onClick={() => setSelectedIndex(index)}
                             className={`cursor-pointer border rounded-md overflow-hidden aspect-square relative ${index === selectedIndex ? "border-blue-500" : "border-gray-600"}`}>
                            <Image
                                src={`http://127.0.0.1:9000/ml-media/${item.file_key}`}
                                alt="photo"
                                fill
                                className="object-cover"
                                unoptimized
                            />


                            {item.detection_result && <div
                                className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded">{item.detection_result.defect_type}</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#1A1A25] rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Информация о фото #{selectedIndex + 1}</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Обнаружено дефектов:</span>
                        <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">{defectCount}</span>
                    </div>
                </div>

                {currentPhoto ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Image src={`http://127.0.0.1:9000/ml-media/${currentPhoto.file_key}`} alt="Выбранное фото"
                                   unoptimized
                                   width={400} height={300} className="rounded-lg object-cover w-full"/>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Детали</h3>
                                <div className="space-y-2 text-sm">
                                    <p><span
                                        className="text-gray-400">Дата создания:</span> {currentPhoto.created_at || "Не указана"}
                                    </p>
                                    <p><span
                                        className="text-gray-400">Координаты:</span> {currentLat?.toFixed(6)}, {currentLng?.toFixed(6)}
                                    </p>
                                </div>
                            </div>

                            {currentDetection ? (
                                <div className="bg-red-900/30 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">Обнаружен дефект</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-gray-400">Тип:</span> {currentDetection.defect_type}
                                        </p>
                                        <p><span
                                            className="text-gray-400">Уверенность:</span> {(currentDetection.confidence * 100).toFixed(2)}%
                                        </p>
                                        <p><span
                                            className="text-gray-400">Координаты:</span> ({currentDetection.coordinates.x}, {currentDetection.coordinates.y})
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-900/30 p-4 rounded-lg"><p className="text-sm">На этом
                                    изображении дефекты не обнаружены.</p></div>
                            )}
                        </div>
                    </div>
                ) : <p className="text-gray-400">Выберите фотографию для просмотра деталей.</p>}
            </div>

            <div className="bg-[#1A1A25] rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Детальная таблица</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-700">
                            <th className="py-2 px-4 text-left">№</th>
                            <th className="py-2 px-4 text-left">Ответ помощника</th>
                            <th className="py-2 px-4 text-left">Координаты</th>
                            <th className="py-2 px-4 text-left">Дата создания</th>
                            <th className="py-2 px-4 text-left">Фото</th>
                        </tr>
                        </thead>
                        <tbody>
                        {photos.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-800 hover:bg-[#2A2A35]">
                                <td className="py-3 px-4">{index + 1}</td>
                                <td className="py-3 px-4">{item.detection_result ?
                                    <span className="text-red-400">{item.detection_result.defect_type}</span> :
                                    <span className="text-green-400">Без дефектов</span>}</td>
                                <td className="py-3 px-4">{item.latitude && item.longitude ? `${parseFloat(item.latitude).toFixed(6)}, ${parseFloat(item.longitude).toFixed(6)}` :
                                    <span className="text-gray-500">Нет</span>}</td>
                                <td className="py-3 px-4">{item.created_at || "—"}</td>
                                <td className="py-3 px-4">
                                    <div className="w-12 h-12 relative"><Image
                                        src={`http://127.0.0.1:9000/ml-media/${item.file_key}`} alt={`thumb-${index}`}
                                        fill unoptimized
                                        className="object-cover rounded"/></div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
           </div>
        </div>
    );
}

"use client";

import {useState, useEffect} from "react";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import Header from "@/app/component/Header";
import {apiFetch} from "@/app/api/api";
import Link from "next/link";

interface Stats {
    total: number;
    processed: number;
    not_processed: number;
}

export default function Stats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiFetch<Stats>("vision/batches/stats/", {
                    method: "GET",
                });
                setStats(data);
            } catch (error) {
                console.error("Ошибка при загрузке статистики:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const processedPercentage = stats ? Math.round((stats.processed / stats.total) * 100) : 0;
    const defectsPercentage = 68;

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-64 md:size-96 bottom-0 pointer-events-none opacity-50"
            />
            <Header/>

            <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 z-20">
                <div className="bg-[#1A1A25] p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
                    <div className="text-xs sm:text-sm text-gray-500 mb-2">
                        <Link href="/loadimage" className="hover:text-gray-300 transition-colors">
                            Главная
                        </Link>{" "}
                        / Статистика
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#119BD7]">Статистика</h1>
                </div>

                {loading ? (
                    <div className="bg-[#1A1A25] p-6 rounded-lg flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#119BD7]"></div>
                            <span className="text-gray-400 text-sm sm:text-base">Загрузка статистики...</span>
                        </div>
                    </div>
                ) : stats ? (
                    <>
                        <div className="bg-[#1A1A25] p-4 sm:p-6 md:p-8 rounded-lg mb-4 sm:mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12">
                                <div className="flex flex-col items-center">
                                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 mb-4 sm:mb-6">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="35%"
                                                stroke="#2A2A35"
                                                strokeWidth="20"
                                                fill="none"
                                                className="sm:stroke-[22] md:stroke-[24]"
                                            />
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="35%"
                                                stroke="#119BD7"
                                                strokeWidth="20"
                                                fill="none"
                                                strokeDasharray={`${processedPercentage * 5.026} ${502.6 - processedPercentage * 5.026}`}
                                                strokeLinecap="round"
                                                className="sm:stroke-[22] md:stroke-[24]"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                                {processedPercentage}%
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-[#119BD7] mb-2">Обработано</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm text-center">среди всех изображений</p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 mb-4 sm:mb-6">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="35%"
                                                stroke="#2A2A35"
                                                strokeWidth="20"
                                                fill="none"
                                                className="sm:stroke-[22] md:stroke-[24]"
                                            />
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="35%"
                                                stroke="#119BD7"
                                                strokeWidth="20"
                                                fill="none"
                                                strokeDasharray={`${defectsPercentage * 5.026} ${502.6 - defectsPercentage * 5.026}`}
                                                strokeLinecap="round"
                                                className="sm:stroke-[22] md:stroke-[24]"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                                {defectsPercentage}%
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-[#119BD7] mb-2">Дефектов</h3>
                                    <p className="text-gray-400 text-xs sm:text-sm text-center">Обнаружено</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1A1A25] rounded-lg mb-4 sm:mb-6 overflow-hidden relative">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
                            >
                                <source src="https://cit.gov.ru/v/3.mp4" type="video/mp4"/>
                            </video>
                            <div className="relative p-4 sm:p-6 md:p-8 z-10">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-semibold text-gray-400 mb-1 sm:mb-2">KPI</h4>
                                        <p className="text-xs text-gray-500">сколько изображений обработано</p>
                                    </div>
                                    <div className="text-4xl sm:text-5xl font-bold text-[#119BD7]">{stats.total}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="bg-[#1A1A25] p-4 sm:p-6 rounded-lg border-l-4 border-[#119BD7]">
                                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-2">Всего изображений</div>
                                <div className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</div>
                            </div>

                            <div className="bg-[#1A1A25] p-4 sm:p-6 rounded-lg border-l-4 border-green-500">
                                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-2">Обработано</div>
                                <div className="text-2xl sm:text-3xl font-bold text-white">{stats.processed}</div>
                            </div>

                            <div className="bg-[#1A1A25] p-4 sm:p-6 rounded-lg border-l-4 border-yellow-500 sm:col-span-2 lg:col-span-1">
                                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-2">Не обработано</div>
                                <div className="text-2xl sm:text-3xl font-bold text-white">{stats.not_processed}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-[#1A1A25] p-6 rounded-lg text-center text-gray-400">
                        Не удалось загрузить статистику
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import React, {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import Header from "@/app/component/Header";
import {apiFetch} from "@/app/api/api";
import Link from "next/link";
import dynamic from 'next/dynamic';
import 'chart.js/auto';

const Doughnut = dynamic(() => import('react-chartjs-2').then((mod) => mod.Doughnut), {
    ssr: false,
});

interface BatchStats {
    batch_id: number;
    batch_name: string;
    total: number;
    processed: number;
    not_processed: number;
    images_with_damage: number;
    damage_percentage: number;
}

export default function Stats() {
    const [batches, setBatches] = useState<BatchStats[]>([]);
    const [openedBatchId, setOpenedBatchId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        apiFetch<BatchStats[]>("vision/batches/stats/", {method: "GET"})
            .then(data => setBatches(data))
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    const doughnutOptions = {
        cutout: "80%",
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    // Внутри Stats компонента:

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center overflow-x-hidden">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 w-40 h-40 md:w-96 md:h-96 bottom-0 pointer-events-none opacity-50"
                // w-40/h-40 для мобильных, md:w-96/h-96 на десктопе
            />
            <Header/>
            <div className="w-full max-w-7xl px-2 sm:px-4 lg:px-8 mt-4 sm:mt-6 z-20">
                <div className="bg-[#1A1A25] p-3 sm:p-6 rounded-lg mb-4 sm:mb-6">
                    <div className="text-xs sm:text-sm text-gray-500 mb-2">
                        <Link href="/loadimage" className="hover:text-gray-300 transition-colors">
                            Главная
                        </Link>{" "}
                        / Статистика
                    </div>
                    <h1 className="text-lg sm:text-2xl font-bold text-[#119BD7]">Статистика</h1>
                </div>
                {loading ? (
                    <div
                        className="bg-[#1A1A25] p-6 rounded-lg flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#119BD7]"></div>
                            <span className="text-gray-400 text-sm sm:text-base">Загрузка статистики...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {batches.map(batch => (
                            <div
                                key={batch.batch_id}
                                className={`bg-[#1A1A25] p-3 sm:p-6 rounded-lg w-full cursor-pointer transition-all border-l-4 ${openedBatchId === batch.batch_id ? "border-[#119BD7]" : "border-transparent"}`}
                                onClick={() => setOpenedBatchId(openedBatchId === batch.batch_id ? null : batch.batch_id)}
                            >
                                <div
                                    className="flex flex-col sm:flex-row items-start sm:items-center overflow-hidden justify-between gap-2">
                                    <div className="w-full sm:w-1/2">
                                        <h2 className="text-base sm:text-lg font-bold text-[#119BD7] truncate">{batch.batch_name || `Проект ${batch.batch_id}`}</h2>
                                    </div>
                                    <div className="flex gap-4 sm:gap-6 justify-between w-full sm:w-1/2">
                                        <div className="flex flex-col items-center">
                                            <div className="text-xs text-gray-400">Всего</div>
                                            <div className="text-white font-bold">{batch.total}</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-xs text-gray-400">Обработано</div>
                                            <div className="text-white font-bold">{batch.processed}</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-xs text-gray-400">Дефектов</div>
                                            <div className="text-white font-bold">{batch.images_with_damage}</div>
                                        </div>
                                    </div>
                                </div>
                                {openedBatchId === batch.batch_id && (
                                    <>
                                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                            <div className="flex flex-col items-center w-full">
                                                <div className="w-32 h-32 sm:w-40 sm:h-40 relative">
                                                    <Doughnut
                                                        data={{
                                                            labels: ["Обработано", "Не обработано"],
                                                            datasets: [
                                                                {
                                                                    data: [batch.processed, batch.total - batch.processed],
                                                                    backgroundColor: ["#119BD7", "#2A2A35"],
                                                                    borderWidth: 0,
                                                                },
                                                            ],
                                                        }}
                                                        options={doughnutOptions}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-lg sm:text-2xl font-bold text-white">
                                                        {batch.total ? Math.round((batch.processed / batch.total) * 100) : 0}%
                                                    </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="text-base sm:text-xl font-bold text-[#119BD7] my-2">Обработано
                                                </div>
                                                <div className="text-gray-400 text-xs text-center">от всех изображений
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center w-full">
                                                <div className="w-32 h-32 sm:w-40 sm:h-40 relative">
                                                    <Doughnut
                                                        data={{
                                                            labels: ["С дефектами", "Без дефектов"],
                                                            datasets: [
                                                                {
                                                                    data: [batch.damage_percentage, 100 - batch.damage_percentage],
                                                                    backgroundColor: ["#FF6978", "#2A2A35"],
                                                                    borderWidth: 0,
                                                                },
                                                            ],
                                                        }}
                                                        options={doughnutOptions}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-lg sm:text-2xl font-bold text-white">
                                                        {Math.round(batch.damage_percentage)}%
                                                    </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="text-base sm:text-xl font-bold text-[#FF6978] my-2">Дефектов
                                                </div>
                                                <div className="text-gray-400 text-xs text-center">процент дефектных
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-6 sm:mt-8">
                                            <button
                                                className="px-3 sm:px-6 py-2 sm:py-3 rounded-full border border-[#119BD7] text-[#119BD7] font-medium flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-[#119BD7] hover:text-white transition-colors"
                                                onClick={() => router.push(`/batch/${batch.batch_id}`)}
                                            >
                                                Перейти к батчу
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
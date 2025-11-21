"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/app/api/api";
import { VscSettings } from "react-icons/vsc";
import { BiCalendar } from "react-icons/bi";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import Header from "@/app/component/Header";

interface Project {
    id: number;
    name: string;
    uploaded_at: string;
    photo_count: number;
    detection_results: string[];
    processing_status: string;
}

interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Project[];
}

type ProcessingStatus = "not_processed" | "processing" | "completed" | "reviewed";

const STATUS_LABELS: Record<ProcessingStatus, { label: string; color: string }> = {
    not_processed: { label: "Не обработан", color: "bg-gray-500" },
    processing: { label: "В процессе", color: "bg-blue-500" },
    completed: { label: "Завершен", color: "bg-yellow-500" },
    reviewed: { label: "Проверен", color: "bg-green-500" },
};

const PAGE_SIZE = 20;

export default function AllProject() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDateRangePicker, setShowDateRangePicker] = useState(false);
    const [dateRange, setDateRange] = useState<{
        start: string;
        end: string;
    }>({
        start: "",
        end: "",
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [previousPage, setPreviousPage] = useState<string | null>(null);

    const fetchProjects = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("size", PAGE_SIZE.toString());

            if (dateRange.start) params.append("date_from", dateRange.start);
            if (dateRange.end) params.append("date_to", dateRange.end);

            const query = params.toString() ? `?${params.toString()}` : "";
            const url = `vision/batches/${query}`;

            console.log(`🔍 Загрузка страницы ${page}, URL: ${url}`);

            const response: ApiResponse = await apiFetch<ApiResponse>(url, {
                method: "GET",
            });
            setProjects(response.results);
            setTotalCount(response.count);
            setNextPage(response.next);
            setPreviousPage(response.previous);
        } catch (error) {
            toast.error("Не удалось загрузить проекты");
        } finally {
            setLoading(false);
        }
    }, [dateRange.start, dateRange.end]);

    useEffect(() => {
        fetchProjects(currentPage);
    }, [currentPage, fetchProjects]);

    const handleDateChange = (type: "start" | "end", value: string) => {
        setDateRange((prev) => ({
            ...prev,
            [type]: value,
        }));
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        setShowDateRangePicker(false);
    };

    const handleResetFilters = () => {
        setDateRange({ start: "", end: "" });
        setShowDateRangePicker(false);
        setCurrentPage(1);
    };

    const handleNextPage = () => {
        if (nextPage) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePreviousPage = () => {
        if (previousPage && currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const displayDateRange =
        dateRange.start && dateRange.end
            ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
            : "Все время";

    const getStatusBadge = (status: string) => {
        const statusKey = status as ProcessingStatus;
        const config = STATUS_LABELS[statusKey] || {
            label: status,
            color: "bg-gray-500",
        };

        return (
            <span
                className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${config.color}`}
            >
                {config.label}
            </span>
        );
    };

    const getItemNumber = (index: number) => {
        return (currentPage - 1) * PAGE_SIZE + index + 1;
    };

    const getDisplayRange = () => {
        const start = (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(start + projects.length - 1, totalCount);
        return { start, end };
    };

    const { start, end } = getDisplayRange();

    return (
        <div className="w-full mx-auto bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0 pointer-events-none"
            />
            <Header />

            <div className="w-4/5 mt-6 z-20">
                <div className=" rounded-lg">
                    <div className="bg-[#1A1A25] p-6 rounded-lg mb-6">
                        <div className="text-sm text-gray-500 mb-2">
                            <Link href="/loadimage" className="hover:text-gray-300 transition-colors">
                                Главная
                            </Link>{" "}
                            / Все проекты
                        </div>
                        <h1 className="text-2xl font-bold text-[#119BD7]">Все проекты</h1>
                    </div>

                    <div className="bg-[#1A1A25] p-6 rounded-lg items-center gap-5 flex flex-col mb-6 relative">
                        <button
                            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                            className="flex items-center gap-2 w-full justify-center hover:opacity-80 transition-opacity"
                        >
                            <VscSettings size={36} className="text-[#119BD7]" />
                            <div className="w-11/12 flex justify-center p-3 rounded-3xl text-[#119BD7] font-semibold bg-[rgb(17,155,215,33%)]">
                                {displayDateRange}
                            </div>
                        </button>

                        {showDateRangePicker && (
                            <div className="w-11/12 mt-4 p-6 rounded-xl bg-gradient-to-br from-[#1A1A25] to-[#14141F] border border-[#119BD7]/30 shadow-xl flex flex-col space-y-6 transition-all">
                                <h3 className="text-lg font-bold text-[#119BD7] flex items-center gap-2">
                                    <BiCalendar size={24} />
                                    Выбор периода
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#CACACA]">
                                            Начальная дата
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => handleDateChange("start", e.target.value)}
                                            className="w-full px-4 py-3 bg-[#11111A] border-2 border-gray-700 rounded-lg text-[#CACACA]
                                            focus:outline-none focus:border-[#119BD7] focus:ring-2 focus:ring-[#119BD7]/30
                                            hover:border-[#119BD7]/50 transition-all
                                            [color-scheme:dark]
                                            cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-[#CACACA]">
                                            Конечная дата
                                        </label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => handleDateChange("end", e.target.value)}
                                            className="w-full px-4 py-3 bg-[#11111A] border-2 border-gray-700 rounded-lg text-[#CACACA]
                                            focus:outline-none focus:border-[#119BD7] focus:ring-2 focus:ring-[#119BD7]/30
                                            hover:border-[#119BD7]/50 transition-all
                                            [color-scheme:dark]
                                            cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                    <button
                                        onClick={handleResetFilters}
                                        className="px-5 py-2.5 text-sm font-semibold text-gray-300 bg-[#2A2A35] rounded-lg
                                        hover:bg-[#3A3A45] hover:scale-105 transition-all duration-200 shadow-md"
                                    >
                                        Сбросить
                                    </button>
                                    <button
                                        onClick={() => setShowDateRangePicker(false)}
                                        className="px-5 py-2.5 text-sm font-semibold text-gray-300 bg-[#2A2A35] rounded-lg
                                        hover:bg-[#3A3A45] hover:scale-105 transition-all duration-200 shadow-md"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleApplyFilters}
                                        className="px-5 py-2.5 text-[#119BD7] font-semibold bg-[rgb(17,155,215,20%)] rounded-lg
                                        hover:bg-[rgb(17,155,215,35%)] hover:scale-105 transition-all duration-200
                                        border border-[#119BD7]/30 shadow-lg shadow-[#119BD7]/20"
                                    >
                                        Применить фильтр
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1A1A25] rounded-lg z-20 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-800">
                                <thead className="bg-[#1A1A25]">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            №
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            Название
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            Кол-во фото
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            Дата создания
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            Статус
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#119BD7] uppercase tracking-wider">
                                            Действия
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#1A1A25] divide-y divide-gray-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#119BD7]"></div>
                                                    <span className="ml-3">Загрузка проектов...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : projects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                Нет проектов для отображения
                                            </td>
                                        </tr>
                                    ) : (
                                        projects.map((project, index) => (
                                            <tr key={project.id} className="hover:bg-[#29293D] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">
                                                    {String(getItemNumber(index)).padStart(2, "0")}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-white">
                                                        {project.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {project.photo_count}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {formatDate(project.uploaded_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {getStatusBadge(project.processing_status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <Link
                                                        href={`/batch/${project.id}?name=${encodeURIComponent(
                                                            project.name
                                                        )}`}
                                                        className="text-[#119BD7] hover:text-[#1da9f0] transition-colors"
                                                    >
                                                        Подробнее →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {!loading && projects.length > 0 && (
                        <div className="mt-6 flex items-center justify-between bg-[#1A1A25] p-4 rounded-lg">
                            <div className="text-sm text-gray-400">
                                Показаны {start} - {end} из {totalCount}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={!previousPage}
                                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        previousPage
                                            ? "bg-[#119BD7] text-white hover:bg-[#1da9f0]"
                                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    ← Назад
                                </button>
                                <span className="px-4 py-2 text-[#119BD7] font-semibold">
                                    Страница {currentPage}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!nextPage}
                                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                        nextPage
                                            ? "bg-[#119BD7] text-white hover:bg-[#1da9f0]"
                                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    Вперед →
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                        <Link
                            href="/loadimage"
                            className="inline-flex items-center px-6 py-3 border border-[#119BD7] text-[#119BD7] rounded-full font-medium hover:bg-[#119BD7] hover:text-white transition-colors"
                        >
                            + Создать проект
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

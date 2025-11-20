"use client";

import {useState, useEffect} from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {apiFetch} from "@/app/lib/api";
import {VscSettings} from "react-icons/vsc";

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

interface DetectionResult {
    id: number;
    defect_type: string;
    confidence: number;
    coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface Project {
    id: number;
    name: string;
    uploaded_at: string; // API использует uploaded_at вместо created_at
    photo_count: number;
    detection_results: DetectionResult[];
}

interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Project[];
}

export default function AllProject() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDateRangePicker, setShowDateRangePicker] = useState(false);
    const [dateRange, setDateRange] = useState<{
        start?: string;
        end?: string;
    } | null>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user: User = JSON.parse(userStr);
                setCurrentUser(user);
            }
        } catch (error) {
            console.error("Ошибка при загрузке пользователя:", error);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [dateRange]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (dateRange?.start) params.append("date_from", dateRange.start);
            if (dateRange?.end) params.append("date_to", dateRange.end);

            const query = params.toString() ? `?${params.toString()}` : "";
            const url = `vision/batches/${query}`;

            const response: ApiResponse = await apiFetch<ApiResponse>(url, {
                method: "GET",
            });
            setProjects(response.results);
        } catch (error) {
            console.error("Ошибка при загрузке проектов:", error);
            toast.error("Не удалось загрузить проекты");
        } finally {
            setLoading(false);
        }
    };


    const handleDateChange = (type: 'start' | 'end', value: string) => {
        setDateRange(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {day: '2-digit', month: 'short', year: 'numeric'});
    };

    const displayDateRange = dateRange
    ? `${formatDate(dateRange.start!)} - ${formatDate(dateRange.end!)}`
    : "Все время";

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
                <div className=" p-6 rounded-lg ">
                    <div className="bg-white p-6 rounded-lg mb-6">
                        <div className="text-sm text-gray-500 mb-2">
                            <Link href={"/loadimage"}>Главная</Link> / Все проекты
                        </div>
                        <h1 className="text-2xl font-bold text-orange-500">Все проекты</h1>
                    </div>
                    <div className="bg-white p-6 rounded-lg items-center gap-5 flex flex-col mb-6 relative">
                        <button
                            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                            className="flex items-center gap-2 w-full justify-center"
                        >
                            <VscSettings size={36} className="text-orange-500"/>
                            <div
                                className="w-11/12 flex justify-center p-2 rounded-3xl text-orange-500 font-s bg-orange-100">
                                {displayDateRange}
                            </div>
                        </button>

                        {showDateRangePicker && (
                            <div
                                className="w-11/12 mt-4 p-4 bg-white rounded-lg border border-gray-200 flex flex-col space-y-4 transition-all">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Начальная дата
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange?.start}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Конечная дата
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange?.end}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button
                                        onClick={() => setShowDateRangePicker(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={() => {
                                            fetchProjects();
                                            setShowDateRangePicker(false);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
                                    >
                                        Применить
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="bg-white rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        №
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Название
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Кол-во фото
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Дата создания
                                    </th>

                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                            Загрузка проектов...
                                        </td>
                                    </tr>
                                ) : projects.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                            Нет проектов
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project, index) => (
                                        <tr key={project.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {String(index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div
                                                        className="text-sm font-bold  text-gray-900">{project.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {project.photo_count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(project.uploaded_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link
                                                    href={`/project/${project.id}`}
                                                    className="text-orange-600 hover:text-orange-900"
                                                >
                                                    Подробнее
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/loadimage"
                            className="inline-flex items-center px-6 py-2 border border-orange-400 text-orange-500 rounded-full font-medium hover:bg-orange-50 transition-colors"
                        >
                            Создать проект
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
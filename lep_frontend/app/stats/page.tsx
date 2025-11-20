"use client";

import Image from "next/image";
import backImage from "@/app/assets/backimage.svg";
import Header from "@/app/component/Header";

export default function Stats() {
    return (
        <div className="w-full mx-auto  bg-[#11111A] min-h-screen flex flex-col items-center">
            <Image
                src={backImage}
                alt=""
                className="absolute right-0 z-0 size-96 bottom-0"
            />
            <Header />

            <div className="w-4/5 mt-6 z-20">
                <div className="bg-[#1A1A25] p-6 rounded-lg">
                    <h1 className="text-2xl font-bold text-[#119BD7] mb-6">Статистика</h1>
                    <p className="text-[#CACACA]">Статистика будет отображаться здесь</p>
                </div>
            </div>
        </div>
    );
}

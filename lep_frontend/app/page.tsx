'use client'
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/app/lib/AuthContext";
import {FiEye, FiEyeOff} from "react-icons/fi";
import Image from "next/image";
import backImage from "@/app/assets/backimage.svg"
import logo from "@/app/assets/logo.svg"
export default function LoginPage() {
    const {login} = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password, rememberMe);
            router.push("/loadimage");
        } catch {
            setError("Неверные данные");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#11111A] flex justify-center items-center p-4">
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
            <form
                onSubmit={handleSubmit}
                className="bg-[#1A1A25] w-5/6 p-6 z-20 max-w-md gap-5 flex flex-col items-center rounded-lg"
            >
                <p className="text-2xl w-full font-bold text-[#119BD7] text-center">Добро пожаловать</p>

                <input
                    className="p-2 w-full border border-[#BDBDBD] text-[#BDBDBD] rounded-md"
                    type="text"
                    placeholder="Почта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="relative w-full">
                    <input
                        className="p-2 w-full border border-[#BDBDBD] text-[#BDBDBD] rounded-md"
                        type={showPassword ? "text" : "password"}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                        className="absolute right-2 top-1/2 text-[#BDBDBD] -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FiEyeOff size={20}/> : <FiEye size={20}/>}
                    </span>
                </div>

                <div className="w-full flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`appearance-none w-5 h-5 border-2 border-gray-400 rounded-full text-[#BDBDBD] 
                            checked:bg-[#119BD7] cursor-pointer transition`}
                    />
                    <label htmlFor="rememberMe" className="text-[#BDBDBD] text-sm select-none">
                        Запомнить меня
                    </label>
                </div>

                {error && <p className="text-red-500">{error}</p>}

                <button className="bg-[#119BD7] w-full py-2 text-white rounded-full transition" type="submit">
                    Войти
                </button>
            </form>
        </div>
    );
}

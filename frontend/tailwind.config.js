/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '24px',
            },
            colors: {
                primary: '#1A3263',
                secondary: '#547792',
                accent: '#FAB95B',
                footer: '#E8E2DB',
            }
        },
    },
    plugins: [],
}

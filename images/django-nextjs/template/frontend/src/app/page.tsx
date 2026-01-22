'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string>('checking...')

  useEffect(() => {
    fetch('http://localhost:8000/api/health/')
      .then(res => res.json())
      .then(data => setApiStatus(data.message))
      .catch(() => setApiStatus('API not reachable'))
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Django + Next.js Starter</h1>
      <p className="text-gray-600 mb-8">Fullstack development template</p>
      
      <div className="grid grid-cols-2 gap-8 text-center">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Backend</h2>
          <p className="text-sm text-gray-500">Django REST Framework</p>
          <p className="mt-2 text-sm">Status: {apiStatus}</p>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Frontend</h2>
          <p className="text-sm text-gray-500">Next.js + Tailwind CSS</p>
          <p className="mt-2 text-sm text-green-600">Running</p>
        </div>
      </div>

      <div className="mt-12 text-sm text-gray-500">
        <p>Backend: <code>cd backend && uv run python manage.py runserver</code></p>
        <p>Frontend: <code>cd frontend && npm run dev</code></p>
      </div>
    </main>
  )
}

import { CreateRaffleForm } from '@/components/forms/CreateRaffleForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewRafflePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/rifas" 
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a rifas
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nueva Rifa</h1>
        <p className="text-gray-600">Completa la información para crear una nueva rifa</p>
      </div>

      <CreateRaffleForm />
    </div>
  );
}
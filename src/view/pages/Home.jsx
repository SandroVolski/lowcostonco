import React from 'react';
import { Database, Users, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";


import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from "../../components/PageTransition";

import '../../App.css';
import './Home.css';

function CardContent({ item }) {
  const Icon = item.icon;
  
  return (
    <>
      <div 
        className="flex items-center justify-center text-center mb-4 p-4 rounded-lg"
        style={{ background: "linear-gradient(90deg, #c6d651 30%, #8cb369 100%)" }}
        >
        <Icon className="w-6 h-6 mr-2" style={{ color: "#f1f1f1" }} />
        <h3 className="text-xl font-semibold" style={{ color: "#f1f1f1" }}>{item.title}</h3>
      </div>
      <div className="mt-[-10px]">
        <p className="text-sm text-[#e4a94f] mb-2">Principais Colunas:</p>
        <ul className="space-y-1">
          {item.columns.map((column, index) => (
            <li key={index} style={{ color: "#35524a" }}>{column}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default function Home() {
  const databases = [
    {
      title: 'Relação de Serviços',
      icon: Database,
      columns: ['Princípio Ativo', 'Código', 'Laboratórios'],
      href: '/ServicoRelacionada',
      isClickable: true,
    },
    {
      title: 'Pacientes em Tratamento',
      icon: Users,
      columns: ['Nome', 'Plano de Saúde', 'Medicamentos'],
      href: '/PacientesEmTratamento',
      isClickable: true,
    },
    {
      title: 'Empresas',
      icon: Building2,
      columns: ['Médicos', 'Planos', 'Cidades'],
      href: '#',
      isClickable: false,
    },
  ];

  return (
    <PageTransition>
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header userName="Douglas" />

        <div className="main-layout">
            <div className="max-w-7xl mx-auto">
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{ color: "#35524a" }}>BANCOS DE DADOS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {databases.map((item, index) => (
                        <motion.div
                        key={index}
                        initial={{ y: -20, opacity: 2 }}
                        animate={{ 
                          y: 0, 
                          opacity: item.isClickable ? 1 : 0.4 // Define a opacidade baseada em isClickable
                        }}
                        transition={{
                            duration: 0.3, // Duração da animação
                            delay: index * 0.2, // Atraso progressivo para o efeito de onda
                            type: "spring", // Tipo de animação (spring para efeito elástico)
                            stiffness: 100, // Rigidez da mola (ajuste para mais/menos elasticidade)
                            damping: 10, // Amortecimento (ajuste para mais/menos rebote)
                        }}
                        whileHover={{
                            scale: 1, // Aumenta o card levemente no hover
                            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)", // Adiciona sombra no hover
                        }}

                        style={{ 
                          boxShadow: "0 0 12px rgba(0, 0, 0, 0.3)",
                          backgroundColor: "#f1f1f1"
                        }}
                        className={`rounded-lg shadow-md p-0 transition-all duration-500 hover:shadow-[10px_-10px_15px_rgba(0.2,0,0,0.2)] hover:-translate-y-1 ${
                            item.isClickable ? 'cursor-pointer' : 'opacity-30'
                          }`}
                        >
                        {item.isClickable ? (
                            <Link to={item.href} className="block h-full">
                            <CardContent item={item} />
                            </Link>
                        ) : (
                            <CardContent item={item} />
                        )}
                        </motion.div>
                    ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-6" style={{ color: "#35524a" }}>ANÁLISE DE DADOS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {databases.map((item, index) => (
                        <motion.div
                        key={index}
                        initial={{ y: 20, opacity: 2 }}
                        animate={{ 
                          y: 0, 
                          opacity: item.isClickable ? 0.4 : 0.4 // Define a opacidade baseada em isClickable
                        }}
                        transition={{
                            duration: 0.3, // Duração da animação
                            delay: index * 0.2, // Atraso progressivo para o efeito de onda
                            type: "spring", // Tipo de animação (spring para efeito elástico)
                            stiffness: 100, // Rigidez da mola (ajuste para mais/menos elasticidade)
                            damping: 10, // Amortecimento (ajuste para mais/menos rebote)
                        }}
                        whileHover={{
                            scale: 1, // Aumenta o card levemente no hover
                            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)", // Adiciona sombra no hover
                        }}
                        style={{ backgroundColor: "#f1f1f1" }}
                        className={`rounded-lg shadow-md p-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${
                            item.isClickable ? 'opacity-30' : 'opacity-30'
                        }`}
                        >
                        <h3 
                        className="text-xl font-semibold p-2 rounded-lg" 
                        style={{ 
                          background: "linear-gradient(90deg, #c6d651 30%, #8cb369 100%)",
                          color: "#f1f1f1"
                        }}
                        >
                        {item.title}
                        </h3>

                        </motion.div>
                    ))}
                    </div>
                </section>
                </div>
            </div>
        </div>
    </div>
    </PageTransition>
  );
}
import React from 'react';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from "../../components/PageTransition";
import { Construction, Clock, AlertCircle, ArrowRight, Settings, Hammer, Wrench } from 'lucide-react';

import '../../App.css';

// Você pode salvar este CSS em um arquivo separado como Empresas.css
// ou adicionar estes estilos ao seu arquivo CSS global
const styles = {
  mainContent: {
    flex: 1,
    marginLeft: '16rem', /* Equivalente a ml-64 */
    padding: '1.5rem', /* Equivalente a p-6 */
    height: 'calc(100vh - 64px)',
    marginTop: '7rem'
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f1f1f1',
  },
  constructionContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 150px)',
    textAlign: 'center',
    padding: '2rem',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '300px',
    backgroundColor: '#f7c59f',
    borderRadius: '100%',
    margin: '0 auto 2rem auto',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#35524a',
    marginBottom: '1rem',
    fontFamily: 'CodecProExtraBold',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#575654',
    marginBottom: '2rem',
    maxWidth: '600px',
  },
  featuresList: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '1.5rem',
    margin: '2rem 0',
    maxWidth: '800px',
  },
  featureCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '250px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  featureIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#e4e9c0',
    marginBottom: '0.5rem',
  },
  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#35524a',
    marginBottom: '0.5rem',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    backgroundColor: '#c6d651',
    color: '#35524a',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    fontWeight: 'medium',
    marginTop: '2rem',
  },
  contactInfo: {
    marginTop: '2rem',
    fontSize: '0.9rem',
    color: '#575654',
  },
};

export default function Empresas() {
  return (
    <PageTransition>
      <div style={styles.container}>
        <Sidebar />
        
        <div style={styles.mainContent}>
          <Header userName="Douglas" />
          
          <main style={styles.constructionContainer}>
            <div style={styles.iconContainer}>
              <Construction size={60} color="#35524a" />
            </div>
            
            <h1 style={styles.title}>Empresas em Desenvolvimento</h1>
            <p style={styles.subtitle}>
              Estamos trabalhando para trazer em breve um sistema completo para gerenciamento de empresas. 
              Sua paciência é apreciada enquanto desenvolvemos esta funcionalidade.
            </p>
            
            <div style={styles.featuresList}>
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <Settings size={24} color="#35524a" />
                </div>
                <h3 style={styles.featureTitle}>Cadastro de Empresas</h3>
                <p>Gerenciamento completo de dados cadastrais de empresas parceiras e clientes.</p>
              </div>
              
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <Clock size={24} color="#35524a" />
                </div>
                <h3 style={styles.featureTitle}>Controle de Contratos</h3>
                <p>Acompanhamento de contratos, datas importantes e termos de cada empresa.</p>
              </div>
              
              <div style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <AlertCircle size={24} color="#35524a" />
                </div>
                <h3 style={styles.featureTitle}>Notificações</h3>
                <p>Alertas para vencimentos, renovações e outras datas importantes.</p>
              </div>
            </div>
            
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
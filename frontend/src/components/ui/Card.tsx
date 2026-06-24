import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base = `bg-card text-card-foreground rounded-xl shadow-premium border border-slate-200/60 overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`;
  if (onClick) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={base}
      >
        {children}
      </motion.div>
    );
  }
  return <div className={base}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-5 border-b border-slate-100 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold tracking-tight text-slate-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-slate-500 mt-1.5 leading-relaxed ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

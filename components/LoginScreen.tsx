
import React, { useState } from 'react';

// --- Internal UI Components (Mimicking Shadcn-ui with exact image styling) ---

const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
  <label
    className={`text-[13px] font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-400 mb-2 block ${className || ''}`}
    {...props}
  />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input
    className={`flex h-14 w-full rounded-2xl border border-slate-800/80 bg-[#070b14] px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 transition-all duration-200 ${className || ''}`}
    {...props}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }> = ({ className, variant = 'primary', ...props }) => {
  const variants = {
    primary: "bg-[#F59E0B] text-slate-950 hover:bg-[#D97706] shadow-lg",
    outline: "border border-slate-800 bg-transparent hover:bg-slate-800/40 text-slate-200",
    ghost: "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl text-[13px] font-black transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-14 px-8 py-2 uppercase tracking-[0.1em] ${variants[variant]} ${className || ''}`}
      {...props}
    />
  );
};

// --- Main Login Component ---

interface LoginScreenProps {
  onLogin: (pin: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('investidor@oasisrj.com.br');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
        alert("O PIN deve conter 4 números.");
        return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      onLogin(pin);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] rounded-full bg-amber-500/5 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header / Logo */}
        <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-[1.5rem] bg-[#111827] border border-slate-800 shadow-2xl mb-2 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <i className="fa-solid fa-layer-group text-3xl text-[#F59E0B]"></i>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center justify-center gap-1">
                OASIS<span className="text-[#F59E0B]">.</span>
            </h1>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] opacity-80">
                Fundo de Arte Tokenizado
            </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#0c121e] border border-slate-800/40 rounded-[2.5rem] p-9 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            <form onSubmit={handleSubmit} className="space-y-7">
                <div className="space-y-5">
                    <div className="space-y-1">
                        <Label htmlFor="email">Email Corporativo</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="ex: nome@oasisrj.com.br"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <Label htmlFor="password">Senha de Acesso</Label>
                        <Input 
                            id="password" 
                            type="password"
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1 pt-4">
                        <Label htmlFor="pin" className="text-slate-200">Crie seu PIN de Segurança</Label>
                        <Input 
                            id="pin" 
                            type="password" 
                            maxLength={4}
                            placeholder="0   0   0   0" 
                            className="text-center tracking-[1em] font-black text-xl text-slate-500 placeholder:text-slate-800"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            required
                        />
                        <p className="text-[10px] text-slate-500 font-medium text-center mt-3 tracking-wide opacity-60">
                            Este PIN será usado para desbloquear ativos privados.
                        </p>
                    </div>
                </div>

                <Button type="submit" className="w-full relative overflow-hidden group active:scale-[0.98]" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <i className="fa-solid fa-circle-notch fa-spin mr-3"></i>
                            Autenticando
                        </>
                    ) : (
                        <>
                            Acessar Plataforma
                            <i className="fa-solid fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i>
                        </>
                    )}
                </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800/50 text-center space-y-5">
                <p className="text-slate-600 text-[11px] font-bold tracking-tight">
                    Não possui credenciais?
                </p>
                <Button variant="outline" className="w-full h-12 tracking-[0.15em] active:scale-[0.98]">
                    Solicitar Convite
                </Button>
            </div>
        </div>

        {/* Footer info - Even more subtle to match reference */}
        <div className="mt-12 text-center opacity-40">
            <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.3em]">
                Ambiente Seguro & Criptografado
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

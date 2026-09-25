"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { authClient } from "@/lib/auth-client";
import { User, Lock, Eye, EyeOff, ArrowRight, Leaf, Users, TrendingUp, ShieldCheck, HeartHandshake, Utensils, ShoppingCart, Apple, Coffee, ConciergeBell } from "lucide-react";
import "./login.css";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    // .trim() prevents mobile autocomplete from injecting trailing spaces
    const loginInput = phone.trim();
    const email = loginInput.includes('@') ? loginInput : `${loginInput}@kalki.internal`;

    try {
      const result = await authClient.signIn.email({ email, password });
      setPending(false);

      if (result.error) {
        setError(result.error.message ?? "Sign-in failed");
        return;
      }

      router.replace(searchParams.get("next") || "/");
    } catch (err) {
      setPending(false);
      // If a network crash happens, this will display the red error box instead of reloading!
      setError(err instanceof Error ? err.message : "A network error occurred.");
    }
  }


  return (
    <div className="kalki-login-wrapper">

      {/* LEFT PANEL (Desktop only) */}
      <div className="kalki-login-left">
        <div>
          <div className="kalki-brand-logo">
            <Leaf size={40} color="#d4af37" />
            <div className="kalki-brand-text">
              <h1>Kalki BOS</h1>
              <div className="kalki-brand-sub">Operate | Grow | Together</div>
            </div>
          </div>

          <div className="kalki-hero-text">
            <h2>Better People<br />Better Food<br /><span className="highlight">A Brighter<br />Tomorrow</span></h2>
            <div style={{ width: '60px', height: '2px', backgroundColor: '#d4af37', margin: '20px 0' }}></div>
            <p>We grow together &ndash;<br />for our customers,<br />our people and our communities.</p>
          </div>
        </div>

        <div className="kalki-stats-grid">
          <div className="kalki-stat-item">
            <Users size={32} />
            <span>Happy<br />Customers</span>
          </div>
          <div className="kalki-stat-item">
            <TrendingUp size={32} />
            <span>Growing<br />Business</span>
          </div>
          <div className="kalki-stat-item">
            <ShieldCheck size={32} />
            <span>Empowered<br />Team</span>
          </div>
          <div className="kalki-stat-item">
            <HeartHandshake size={32} />
            <span>Stronger<br />Communities</span>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '4rem', right: '4rem', opacity: 0.8 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#d4af37', transform: 'rotate(-10deg)' }}>
            Kalki<br />Always Forward
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (Auth Card) */}
      <div className="kalki-login-right">

        {/* Mobile Logo (Only visible when right panel spans full width) */}
        <div className="kalki-brand-logo" style={{ justifyContent: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Leaf size={48} color="#a4814d" />
          <div className="kalki-brand-text" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem' }}>Kalki BOS</h1>
            <div className="kalki-brand-sub" style={{ fontSize: '0.6rem' }}>Business Operating System</div>
            <div className="kalki-brand-sub" style={{ marginTop: '8px', color: '#836336' }}>Operate | Grow | Together</div>
          </div>
        </div>

        <div className="kalki-login-title">
          <h2>Welcome Back!</h2>
          <p>Login to your Kalki Business Operating System</p>
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', background: '#fee2e2', padding: '8px', borderRadius: '4px' }}>{error}</div>}

        <form className="kalki-login-form" onSubmit={submit}>

          <div className="kalki-login-input-group">
            <User size={18} className="kalki-login-input-icon" />
            <input
              type="tel"
              className="kalki-login-input"
              placeholder="Employee ID or Username"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="kalki-login-input-group">
            <Lock size={18} className="kalki-login-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              className="kalki-login-input"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="kalki-login-input-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="kalki-login-options">
            <label>
              <input type="checkbox" style={{ accentColor: '#a4814d' }} /> Remember me
            </label>
            <Link href="#">Forgot password?</Link>
          </div>

          <button type="submit" className="kalki-login-btn" disabled={pending}>
            {pending ? "Authenticating..." : "Login"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="kalki-login-footer">
          <div className="kalki-login-footer-divider">One Team &bull; Many Possibilities</div>

          <div className="kalki-footer-icons">
            <div className="kalki-footer-icon-item">
              <Utensils size={28} strokeWidth={1.5} />
              <span>Restaurant</span>
            </div>
            <div className="kalki-footer-icon-item">
              <ShoppingCart size={28} strokeWidth={1.5} />
              <span>Department<br />Store</span>
            </div>
            <div className="kalki-footer-icon-item">
              <Apple size={28} strokeWidth={1.5} />
              <span>Fresh</span>
            </div>
            <div className="kalki-footer-icon-item">
              <Coffee size={28} strokeWidth={1.5} />
              <span>Snacks &amp; Chats</span>
            </div>
            <div className="kalki-footer-icon-item">
              <ConciergeBell size={28} strokeWidth={1.5} />
              <span>Catering</span>
            </div>
          </div>

          <div className="kalki-initiative">A Kalki Groups Initiative</div>
          <div className="kalki-motto">&ldquo;Better People. Better Food. A Brighter Tomorrow.&rdquo;</div>
        </div>

      </div>

      {/* BOTTOM BAR (Desktop only) */}
      <div className="kalki-bottom-bar">
        <div>
          <span style={{ color: 'white', fontWeight: 600 }}>Kalki Groups</span> &nbsp;|&nbsp; Version 1.0.0
        </div>
        <div>
          <Link href="#">Help</Link>
          <Link href="#">Support</Link>
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#1a1a1a', color: 'white' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

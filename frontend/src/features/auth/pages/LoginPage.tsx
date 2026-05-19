import { Eye, EyeOff, LockKeyhole, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { api } from "../../../services/api";
import { useAuth, type AuthUser } from "../AuthContext";
import "../styles/LoginPage.css";

type LoginResponse = {
  user: AuthUser;
  token: string;
};

function getErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: { detail?: string } } }).response?.data;

  return responseData?.detail ?? "No se ha podido iniciar sesión.";
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/inicio";

  if (isAuthenticated) {
    return <Navigate to="/inicio" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      setIsSubmitting(true);

      const response = await api.post<LoginResponse>("/auth/login/", {
        username,
        password,
      });

      login(response.data.user, response.data.token);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo">
            <img src="/rodillo.svg" alt="" />
          </div>

          <div>
            <h1>Pintura+</h1>
            <p>Gestión de trabajos</p>
          </div>
        </div>

        <div className="login-card__intro">
          <LockKeyhole size={22} />
          <div>
            <h2>Iniciar sesión</h2>
            <p>Accede al panel para gestionar clientes, trabajos y materiales.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña
            <span className="login-form__password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((isVisible) => !isVisible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {errorMessage && <p className="login-form__error">{errorMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            <LogIn size={18} />
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="login-card__footer">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}

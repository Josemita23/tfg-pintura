import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { api } from "../../../services/api";
import { useAuth, type AuthUser } from "../AuthContext";
import "../styles/LoginPage.css";

type RegisterResponse = {
  user: AuthUser;
  token: string;
};

function getErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } }).response?.data;

  if (!responseData) {
    return "No se ha podido crear la cuenta.";
  }

  if (typeof responseData === "string") {
    return responseData;
  }

  if (typeof responseData === "object") {
    return Object.values(responseData as Record<string, unknown>).flat().join(" ");
  }

  return "No se ha podido crear la cuenta.";
}

export function RegisterPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/inicio" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      setIsSubmitting(true);

      const response = await api.post<RegisterResponse>("/auth/register/", {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password,
        password_confirm: passwordConfirm,
      });

      login(response.data.user, response.data.token);
      navigate("/inicio", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card login-card--wide">
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
          <UserPlus size={22} />
          <div>
            <h2>Crear cuenta</h2>
            <p>Registra los datos básicos para acceder a la aplicación.</p>
          </div>
        </div>

        <form className="login-form login-form--grid" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              required
            />
          </label>

          <label>
            Apellidos
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
            />
          </label>

          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

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
                autoComplete="new-password"
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

          <label>
            Repetir contraseña
            <span className="login-form__password">
              <input
                type={showPasswordConfirm ? "text" : "password"}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((isVisible) => !isVisible)}
                aria-label={
                  showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPasswordConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {errorMessage && <p className="login-form__error login-form__full">{errorMessage}</p>}

          <button className="login-form__full" type="submit" disabled={isSubmitting}>
            <UserPlus size={18} />
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="login-card__footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}

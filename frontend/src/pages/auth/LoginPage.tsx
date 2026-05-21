import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/useAuth';

import styles from './Auth.module.css';

export function LoginPage() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      await login(username, password);

      navigate('/orders');
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <h1 className={styles.title}>
          Вход
        </h1>

        <input
          className={styles.input}
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className={styles.input}
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className={styles.error}>
            {error}
          </p>
        )}

        <button
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
        <Link
          to="/register"
          className={styles.link}
        >
          Зарегистрироваться?
        </Link>
      </form>
    </div>
  );
}
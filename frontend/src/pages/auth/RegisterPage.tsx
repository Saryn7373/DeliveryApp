import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { authApi } from '../../api/auth';

import styles from './Auth.module.css';

export function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [email, setEmail] = useState('');

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
      await authApi.register({
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });

      navigate('/orders');
    } catch {
      setError('Ошибка регистрации');
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
          Регистрация
        </h1>

        <input
          className={styles.input}
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Имя"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Фамилия"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          {loading ? 'Создание...' : 'Создать аккаунт'}
        </button>

        <Link
          to="/login"
          className={styles.link}
        >
          Уже есть аккаунт?
        </Link>
      </form>
    </div>
  );
}
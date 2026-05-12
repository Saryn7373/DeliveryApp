# Delivery Backend — Система доставки Пятёрочки

Django REST API для системы доставки продуктов. Бэкенд управляет заказами, товарами, покупателями, курьерами и строит кратчайшие маршруты доставки алгоритмом Дейкстры.

---

## Стек

- Python 3.12
- Django 5.2
- Django REST Framework
- PostgreSQL
- Docker / Docker Compose

---

## Запуск

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd DeliveryAppBackend

# 2. Скопировать .env
cp .env.example .env
# Заполнить SECRET_KEY и DB_PASSWORD

# 3. Поднять контейнеры
docker compose up -d

# 4. Применить миграции
docker compose exec web python manage.py migrate

# 5. Заполнить тестовыми данными
docker compose exec web python manage.py seed_db

# 6. Создать суперпользователя (опционально)
docker compose exec web python manage.py createsuperuser
```

Сервер будет доступен на `http://localhost:8000`.
Браузерный интерфейс DRF: `http://localhost:8000/api/`.

---

## Переменные окружения (.env)

| Переменная | Описание | Пример |
|---|---|---|
| `SECRET_KEY` | Django secret key | `django-insecure-...` |
| `DEBUG` | Режим отладки | `True` |
| `DB_NAME` | Имя базы данных | `Delivery_DB` |
| `DB_USER` | Пользователь БД | `postgres` |
| `DB_PASSWORD` | Пароль БД | `password` |
| `DB_HOST` | Хост БД | `localhost` |
| `DB_PORT` | Порт БД | `5433` |

---

## Структура проекта

```
DeliveryBackend/
├── DeliveryBackend/     # Конфигурация Django (settings, urls, wsgi)
├── orders/              # Заказы, позиции заказа, маршрут, машина состояний
├── products/            # Магазины и товары
├── routing/             # Граф (Node, Edge), алгоритм Дейкстры
└── users/               # Покупатели, курьеры, адреса доставки
```

---

## API

Базовый URL: `/api/`

---

### Routing

#### `POST /api/routing/shortest-path/`
Найти кратчайший маршрут от магазина до адреса (алгоритм Дейкстры).

**Тело запроса:**
```json
{
  "from_node": 1,
  "to_node": 5
}
```

`from_node` — ID узла с типом `STORE`.
`to_node` — ID узла с типом `ADDRESS`.

**Ответ 200:**
```json
{
  "path": [
    {"id": 1, "name": "Склад «Центральный»", "type": "STORE", "latitude": 55.75, "longitude": 37.61},
    {"id": 5, "name": "Тверская, 10", "type": "ADDRESS", "latitude": 55.765, "longitude": 37.605}
  ],
  "total_weight": 0.0187
}
```

**Ошибка 400** — если путь не найден или узлы одинаковые.

---

### Users

#### `GET /api/users/customers/`
Список всех покупателей.

#### `GET /api/users/customers/{id}/`
Детальная информация о покупателе.

#### `GET /api/users/customers/{id}/addresses/`
Адреса доставки покупателя.

#### `GET /api/users/couriers/`
Список курьеров.

#### `GET /api/users/couriers/{id}/`
Детальная информация о курьере.

#### `PATCH /api/users/couriers/{id}/`
Обновить статус курьера или его текущий узел. Все поля опциональны.

**Тело запроса:**
```json
{
  "status": "AVAILABLE",
  "current_node": 2
}
```

Допустимые значения `status`: `AVAILABLE`, `BUSY`.

---

### Products

#### `GET /api/products/stores/`
Список магазинов (без товаров).

#### `GET /api/products/stores/{id}/`
Магазин с полным списком товаров.

#### `GET /api/products/products/`
Все товары. Поддерживает фильтрацию: `?store={id}`.

#### `GET /api/products/products/{id}/`
Конкретный товар.

---

### Orders

#### `GET /api/orders/`
Список заказов. Поддерживает фильтры:
- `?status=DELIVERY` — по статусу
- `?customer={id}` — по покупателю
- `?courier={id}` — по курьеру

#### `POST /api/orders/`
Создать новый заказ. Статус при создании — `DRAFT`.

**Тело запроса:**
```json
{
  "customer": 1,
  "store": 2,
  "delivery_address": 4
}
```

#### `GET /api/orders/{id}/`
Детали заказа: полная информация, позиции, маршрут (если построен).

#### `POST /api/orders/{id}/add_item/`
Добавить товар в заказ. Работает только в статусе `DRAFT`.
Если товар уже есть — количество суммируется. `total_price` пересчитывается автоматически.

**Тело запроса:**
```json
{
  "product": 3,
  "quantity": 2
}
```

#### `DELETE /api/orders/{id}/items/{item_id}/`
Удалить позицию из заказа. Работает только в статусе `DRAFT`. Ответ `204`.

#### `POST /api/orders/{id}/assign_courier/`
Назначить курьера на заказ. Курьер должен быть в статусе `AVAILABLE`.

**Тело запроса:**
```json
{
  "courier_id": 2
}
```

#### `POST /api/orders/{id}/transition/`
Перевести заказ в новое состояние.

**Тело запроса:**
```json
{
  "status": "ASSEMBLING"
}
```

**Допустимые переходы:**

| Текущий статус | Допустимые переходы |
|---|---|
| `DRAFT` | `ASSEMBLING`, `CANCELLED` |
| `ASSEMBLING` | `COURIER_SELECTION`, `CANCELLED` |
| `COURIER_SELECTION` | `DELIVERY`, `CANCELLED` |
| `DELIVERY` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | — |
| `CANCELLED` | — |

При переходе в `ASSEMBLING` автоматически строится и сохраняется маршрут (Дейкстра).
При переходе в `DELIVERY` курьер должен быть назначен.

**Ошибка 400** — если переход недопустим или не выполнены бизнес-правила.

---

## Математическая модель — алгоритм Дейкстры

Реализован в `routing/algorithms.py`.

Город представлен как взвешенный граф:
- **Node** — узел (магазин или адрес доставки) с координатами
- **Edge** — ребро с весом (расстояние)

Алгоритм находит кратчайший путь от узла-магазина до узла-адреса. Граф загружается из БД одним запросом. Результат кэшируется в модели `Route` и автоматически пересчитывается при переходе заказа в статус `ASSEMBLING`.

---

## Машина состояний заказа

Реализована в `orders/state_machine.py`. Граф переходов описан в `ALLOWED_TRANSITIONS`. Проверяет допустимость перехода и выполняет бизнес-правила (курьер назначен, заказ не пустой).

---

## Тестовые данные

```bash
python manage.py seed_db          # заполнить
python manage.py seed_db --clear  # очистить и заполнить заново
```

Создаёт: 3 магазина, 12 товаров, 6 покупателей, 3 курьера, 10 адресов, 8 заказов в разных статусах, граф из 13 узлов.

Тестовые учётные записи:
- Покупатели: `customer1` … `customer6`, пароль `pass1234`
- Курьеры: `courier1` … `courier3`, пароль `pass1234`

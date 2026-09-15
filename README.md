# SpendWise

A simple and practical **expense tracking application** built with HTML, CSS, JavaScript, and Python.

SpendWise helps users record and manage daily expenses through a lightweight frontend. The frontend works immediately using browser `localStorage`, while the project also includes a Python FastAPI backend and SQL schema for future persistent storage.

## ✨ Features

* Add and manage expenses
* Track spending amounts
* Categorize expenses
* View expense records
* Browser-based localStorage support
* Fast and lightweight frontend
* Python FastAPI backend
* SQL database schema
* No frontend framework required

## 🛠️ Technologies

### Frontend

* HTML5
* CSS3
* JavaScript
* Browser localStorage

### Backend

* Python
* FastAPI
* Uvicorn

### Database

* SQL schema included
* Designed for persistent database integration

## 📁 Project Structure

```text
SpendWise/
│
├── frontend/
│   └── index.html
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── schema.sql
│
└── README.md
```

## 🚀 Run the Frontend

The frontend works without starting the backend.

Open:

```text
frontend/index.html
```

in your browser.

Expense data is stored locally using:

```javascript
localStorage
```

This makes the application usable immediately without any server setup.

## 🐍 Run the Backend

Open a terminal in the project directory:

```bash
cd backend
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app:app --reload
```

The API will normally be available at:

```text
http://127.0.0.1:8000
```

FastAPI's interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

## 🔌 Architecture

```text
                SpendWise
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
    Frontend               Backend
 HTML / CSS / JS          FastAPI / Python
          │                   │
          ▼                   ▼
     localStorage          SQL Schema
```

The current frontend operates independently using browser storage. The FastAPI backend provides a foundation for connecting the application to persistent database storage.

## 💾 Storage

### Frontend

The current frontend stores expense data in the browser:

```text
localStorage
```

This means the frontend can be used immediately without a backend.

### Backend

The backend includes an SQL schema intended for persistent storage when database integration is enabled.

## 🔮 Future Improvements

* Connect frontend to FastAPI
* Add SQLite or PostgreSQL persistence
* Expense analytics and charts
* Monthly spending summaries
* Budget tracking
* Export expenses to CSV
* Authentication and user accounts
* REST API integration
* Automated backend tests

## 👨‍💻 Author

**Mahendra Sai Kondaveeti**

B.Tech — Computer Science & Engineering

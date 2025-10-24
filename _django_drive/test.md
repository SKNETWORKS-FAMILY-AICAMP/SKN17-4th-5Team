_django_drive/
├─ manage.py
├─ _django_drive/       # 기존 프로젝트 폴더 (settings.py 등)
│  ├─ settings.py
│  ├─ urls.py
│  └─ ...
├─ frontend/             # 새 앱
│  ├─ __init__.py
│  ├─ views.py
│  ├─ urls.py
│  └─ templates/
│     └─ frontend/
│        ├─ base.html
│        └─ index.html
├─ templates/            # 또는 프로젝트 템플릿 디렉토리
├─ static/
│  ├─ css/
│  │  └─ style.css
│  └─ js/
│     └─ main.js
└─ db.sqlite3

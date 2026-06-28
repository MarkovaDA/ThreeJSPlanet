# 3D Planet — Three.js

Интерактивная 3D-модель Земли: авто-вращение, слой облаков, звёздный фон и управление камерой мышью.

## Запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
npm run preview
```

## Деплой на GitHub Pages

1. Создайте репозиторий `ThreeJSPlanet` на GitHub.
2. Запушьте код в ветку `master`.
3. В настройках репозитория включите **Settings → Pages → Source: GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` соберёт проект и опубликует его на GitHub Pages.

Если имя репозитория другое — поменяйте `SITE_BASE` в workflow и `vite.config.ts`.

## Управление

- Перетаскивание — вращение камеры вокруг планеты
- Колесо мыши — приближение / отдаление
- Панель справа — авто-вращение и скорость

Текстуры загружаются с [threejs.org/examples](https://threejs.org/examples/textures/planets/) для быстрого старта. Позже их можно положить в `public/textures/`.

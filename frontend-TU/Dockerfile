# =====================================================
# Frontend Dockerfile - Multi-stage Build (React + Nginx)
# Tú đóng gói Frontend React vào đây cho nó nhanh gọn 🚀
# Stage 1: Build bằng node:20-slim
# Stage 2: Serve bằng nginx:alpine (siêu nhẹ!)
# =====================================================

# ============ STAGE 1: BUILD ============
FROM node:20-slim AS builder

# Tú set working directory để build React app
WORKDIR /builder

# Tú copy package.json và package-lock.json từ frontend folder
# Build context là root directory, nên paths relative tới root
COPY frontend-TU/package.json frontend-TU/package-lock.json ./

# Tú cài npm dependencies (dùng npm install thay vì npm ci cho flexibility)
RUN echo "[TU-BUILD] 📦 Đang cài npm dependencies..." && \
    npm install --legacy-peer-deps && \
    echo "[TU-BUILD] ✅ Dependencies cài xong!"

# Tú copy toàn bộ source code từ frontend folder
# Source: frontend-TU/ (từ root context)
# Destination: . (current directory /builder)
COPY frontend-TU/ .

# Tú build React app với Vite (production build = tối ưu!)
RUN echo "[TU-BUILD] 🏗️ Đang build React app..." && \
    npm run build && \
    echo "[TU-BUILD] ✅ Build xong! App sẵn sàng!"

# ============ STAGE 2: RUNTIME ============
FROM nginx:alpine

# Tú set working directory
WORKDIR /app

# Tú copy nginx config file từ thư mục gốc
# Build context là root directory, nên nginx.conf nằm ở cùng level
COPY nginx.conf /etc/nginx/nginx.conf

# Tú copy built React app từ builder stage vào nginx
COPY --from=builder /builder/dist /usr/share/nginx/html

# Tú expose port 80 (HTTP)
EXPOSE 80

# Tú add health check cho Nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Tú run nginx server
CMD ["nginx", "-g", "daemon off;"]

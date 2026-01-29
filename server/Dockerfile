# Dùng Node mới nhất
FROM node:20

WORKDIR /usr/src/app

# Sao chép file khai báo dependencies
COPY package*.json ./

# Cài dependencies (Express, v.v.)
RUN npm install

# Sao chép toàn bộ source code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

FROM node:20-slim

# Install OpenSSL and necessary libraries for Puppeteer/Chrome
RUN apt-get update -y && apt-get install -y \
    openssl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

# Hardcoded Environment Variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Y29tcG9zZWQtbWFuLTg5LmNsZXJrLmFjY291bnRzLmRldiQ"
ENV CLERK_SECRET_KEY="sk_test_xNP4RphH7oQ52ucmj9VZOEdiOtwbDP7Ife8s9vIvq8"
ENV DATABASE_URL="mongodb+srv://Sheshu:Sheshu123@cluster0.3fpfvmc.mongodb.net/lawptimize"
ENV DATABASE_SCHEMA="law"
ENV RESEND_API_KEY="re_KYJTGnDY_DkixEdthBse447TNMc1trFje"
ENV EMAIL_DOMAIN="niravana.in"
ENV EMAIL_FROM_INVOICES="invoices@niravana.in"
ENV EMAIL_FROM_NOREPLY="noreply@niravana.in"
# ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://lawptimize.lipiq.in"
# Networking
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
EXPOSE 3000

CMD ["npm", "run", "dev"]

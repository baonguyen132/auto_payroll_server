FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=auto_payroll
ENV MYSQL_USER=payroll_user
ENV MYSQL_PASSWORD=payroll_pass

COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 3306

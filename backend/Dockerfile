FROM python:3.12-slim

WORKDIR /app

# mysqlclient dependency
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/

RUN pip install -r requirements.txt --no-cache-dir --upgrade

COPY . /app/

RUN python manage.py collectstatic --noinput --settings=dailycs_backend.settings

EXPOSE 8001

CMD [ "gunicorn", "--bind", "0.0.0.0:8001", "dailycs_backend.wsgi:application" ]
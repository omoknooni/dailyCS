FROM python:3.12-slim

WORKDIR /app

COPY ./requirements.txt ./

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY cs_question_generation_v2.py .

CMD [ "python", "cs_question_generation_v2.py"]

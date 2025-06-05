# DailyCS Backend API
Django REST Framework 기반 DailyCS 백엔드 service  

## Tech Stack

- **프레임워크**: Django 5.2.1 + Django REST Framework 3.16.0
- **Database**: MySQL
- **API Documentation**: Swagger/OpenAPI (drf-yasg)

## API Endpoints

### Quiz Sets

- `GET /api/quizsets/` - List all quizsets
- `POST /api/quizsets/` - Create a new quizset
- `GET /api/quizsets/{id}/` - Retrieve a specific quiz set
- `PUT /api/quizsets/{id}/` - Update a specific quiz set
- `DELETE /api/quizsets/{id}/` - Delete a specific quiz set
- `POST /api/quizsets/{id}/submit_all/` - Submit answers for all questions in a quiz set

### Questions

- `GET /api/quizsets/{quizset_id}/questions/` - List all questions for a specific quiz set
- `POST /api/quizsets/{quizset_id}/questions/` - Create a new question for a specific quiz set
- `GET /api/quizsets/{quizset_id}/questions/{id}/` - Retrieve a specific question
- `PUT /api/quizsets/{quizset_id}/questions/{id}/` - Update a specific question
- `DELETE /api/quizsets/{quizset_id}/questions/{id}/` - Delete a specific question
- `POST /api/quizsets/{quizset_id}/questions/{id}/submit/` - Submit an answer for a specific question

## Data Models

### QuizSet

```
{
  "id": integer,
  "title": string,
  "description": string,
  "category": string,
  "created_at": datetime,
  "updated_at": datetime
}
```

Available categories:
- OS: Operating Systems
- NET: Networking
- DB: Databases
- GIT: Git / DevOps
- CLOUD: Cloud
- SEC: Security

### Question

```
{
  "id": integer,
  "quiz_set": integer,
  "question_text": string,
  "explanation": string,
  "difficulty_level": string,
  "choices": [
    {
      "id": integer,
      "text": string,
      "order": integer,
      "is_correct": boolean
    }
  ]
}
```

## API Usage Examples

### Submit Answer for a Question

**Request:**
```
POST /api/quizsets/{quizset_id}/questions/{question_id}/submit/
{
  "choice_ids": [1, 3]
}
```

**Response:**
```
{
  "is_correct": true,
  "correct_choice_ids": [1, 3]
}
```

### Submit Answers for an Entire Quiz Set

**Request:**
```
POST /api/quizsets/{quizset_id}/submit_all/
{
  "answers": [
    { "question_id": 1, "choice_ids": [3] },
    { "question_id": 2, "choice_ids": [7, 8] },
    { "question_id": 3, "choice_ids": [12] }
  ]
}
```

**Response:**
```
{
  "quizset_id": 1,
  "total_questions": 3,
  "total_correct": 2,
  "results": [
    {
      "question_id": 1,
      "is_correct": true,
      "correct_choice_ids": [3]
    },
    {
      "question_id": 2,
      "is_correct": false,
      "correct_choice_ids": [7, 9]
    },
    {
      "question_id": 3,
      "is_correct": true,
      "correct_choice_ids": [12]
    }
  ]
}
```

## API Documentation

The API documentation is available through Swagger UI and ReDoc when running in debug mode:

- Swagger UI: `/swagger/`
- ReDoc: `/redoc/`
- OpenAPI Schema: `/swagger.json` or `/swagger.yaml`

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Configure database settings in `dailycs_backend/settings.py`
4. Run migrations:
   ```
   python manage.py migrate
   ```
5. Start the development server:
   ```
   python manage.py runserver
   ```

## Development

To run the development server with debug mode enabled:

```
python manage.py runserver
```

This will make the API documentation available at the endpoints mentioned above.
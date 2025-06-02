from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from .models import QuizSet, Question
from .serializers import QuizSetSerializer, QuestionSerializer

class QuizSetViewSet(viewsets.ModelViewSet):
    queryset = QuizSet.objects.all()
    serializer_class = QuizSetSerializer

    @swagger_auto_schema(
        operation_summary="퀴즈집 전체 제출",
        operation_description="""
        QuizSet 안에 있는 모든 Question에 대해
        사용자가 보낸 선택지(question_id & choice_ids)로 정답 여부를 채점하고,
        각 문제별 결과와 요약(총 문항 수 / 맞힌 개수)을 반환합니다.
        """,
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'answers': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    description="각 문제별로 { question_id, choice_ids[] } 객체를 담은 배열",
                    items=openapi.Items(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'question_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'choice_ids': openapi.Schema(
                                type=openapi.TYPE_ARRAY,
                                items=openapi.Items(type=openapi.TYPE_INTEGER)
                            )
                        },
                        required=['question_id', 'choice_ids']
                    )
                )
            },
            required=['answers']
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'quizset_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'total_questions': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'total_correct': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'results': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Items(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'question_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'is_correct': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                                'correct_choice_ids': openapi.Schema(
                                    type=openapi.TYPE_ARRAY,
                                    items=openapi.Items(type=openapi.TYPE_INTEGER)
                                )
                            }
                        )
                    )
                }
            )
        }
    )
    @action(detail=True, methods=['post'])
    def submit_all(self, request, pk=None):
        """
        POST /api/quizsets/{quizset_pk}/submit_all/

        request.data 예시:
        {
          "answers": [
            { "question_id": 7,  "choice_ids": [22]   },
            { "question_id": 8,  "choice_ids": [26]   },
            { "question_id": 9,  "choice_ids": [30]   }
            // … QuizSet에 속한 모든 question_id에 대해 하나씩
          ]
        }

        response.data 예시:
        {
          "quizset_id": 3,
          "total_questions": 3,
          "total_correct": 2,
          "results": [
            {
              "question_id": 7,
              "is_correct": true,
              "correct_choice_ids": [22]
            },
            {
              "question_id": 8,
              "is_correct": false,
              "correct_choice_ids": [26]
            },
            {
              "question_id": 9,
              "is_correct": true,
              "correct_choice_ids": [30]
            }
          ]
        }
        """
        # 1) 해당 QuizSet이 실제로 존재하는지 확인
        try:
            quizset = QuizSet.objects.get(pk=pk)
        except QuizSet.DoesNotExist:
            return Response(
                {"detail": "QuizSet not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2) QuizSet에 속한 모든 Question ID 목록 구하기
        questions = Question.objects.filter(quiz_set=quizset).prefetch_related('choices')
        question_map = {q.id: q for q in questions}

        submitted_answers = request.data.get('answers')
        if not isinstance(submitted_answers, list):
            return Response(
                {"detail": "'answers' must be a list of { question_id, choice_ids }."},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []
        correct_count = 0
        total = questions.count()

        # 3) 사용자가 보낸 각 answer 객체에 대해 채점
        for answer in submitted_answers:
            qid = answer.get('question_id')
            user_choice_ids = answer.get('choice_ids', [])
            if qid not in question_map:
                # QuizSet에 속하지 않은 question_id가 넘어왔거나 존재하지 않는 ID
                results.append({
                    "question_id": qid,
                    "is_correct": False,
                    "correct_choice_ids": []
                })
                continue

            question = question_map[qid]
            # 정답 choice IDs 집합
            correct_choice_ids = set(
                question.choices.filter(is_correct=True).values_list('id', flat=True)
            )

            # 제출된 choice IDs 집합
            submitted_ids = set(user_choice_ids)
            is_correct = (submitted_ids == correct_choice_ids)
            if is_correct:
                correct_count += 1

            results.append({
                "question_id": qid,
                "is_correct": is_correct,
                "correct_choice_ids": sorted(correct_choice_ids)
            })

        # 4) 결과 반환
        return Response({
            "quizset_id": int(pk),
            "total_questions": total,
            "total_correct": correct_count,
            "results": results
        })
    
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.prefetch_related('choices').all()
    serializer_class = QuestionSerializer

    def get_queryset(self):
        quizset_pk = self.kwargs.get('quizset_pk')
        if quizset_pk is not None:
            return self.queryset.filter(quiz_set_id=quizset_pk)
        
        quizset_q = self.request.query_params.get('quizset')
        if quizset_q:
            return Question.objects.filter(quiz_set_id=quizset_q).prefetch_related('choices')
        return self.queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        total_count = queryset.count()

        return Response({
            'quizset_id': self.kwargs.get('quizset_pk') or self.request.query_params.get('quizset'),
            'total_question_count': total_count,
            'questions': serializer.data
        })

    @swagger_auto_schema(
        operation_summary="문제 채점",
        operation_description="`choice_ids` 배열을 받아, 선택지가 정답과 일치하는지 여부를 반환합니다.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'choice_ids': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Items(type=openapi.TYPE_INTEGER))
            },
            required=['choice_ids']
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'is_correct': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'correct_choice_ids': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Items(type=openapi.TYPE_INTEGER))
                }
            )
        }
    )
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        question = self.get_object()
        submitted_choice_ids = set(request.data.get('choice_ids', []))
        correct_choice_ids = set(question.choices.filter(is_correct=True).values_list('id', flat=True))
        is_correct = submitted_choice_ids == correct_choice_ids
        return Response({
            'is_correct': is_correct,
            'correct_choice_ids': list(correct_choice_ids)
        })

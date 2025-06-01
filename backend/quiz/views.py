from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import QuizSet, Question
from .serializers import QuizSetSerializer, QuestionSerializer

class QuizSetViewSet(viewsets.ModelViewSet):
    queryset = QuizSet.objects.all()
    serializer_class = QuizSetSerializer

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.prefetch_related('choices').all()
    serializer_class = QuestionSerializer

    def get_queryset(self):
        quizset_id = self.request.query_params.get('quizset')
        if quizset_id:
            return self.queryset.filter(quiz_set_id=quizset_id)
        return self.queryset

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

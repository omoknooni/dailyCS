from django.urls import path, include
from rest_framework_nested import routers
from .views import QuizSetViewSet, QuestionViewSet

# 1) 최상위 라우터: QuizSetViewSet
router = routers.SimpleRouter()
router.register(r'quizsets', QuizSetViewSet, basename='quizset')

# 2) Nested 라우터: quizsets/{quizset_pk}/questions
quizset_router = routers.NestedSimpleRouter(router, r'quizsets', lookup='quizset')
quizset_router.register(r'questions', QuestionViewSet, basename='quizset-questions')

urlpatterns = [
    # /api/quizsets/      -> QuizSetViewSet list, create, retrieve, update, delete
    # /api/quizsets/{pk}/ -> QuizSetViewSet retrieve, update, delete
    path('', include(router.urls)),

    # /api/quizsets/{quizset_pk}/questions/      -> QuestionViewSet list (filter by quizset_pk)
    # /api/quizsets/{quizset_pk}/questions/{pk}/ -> QuestionViewSet retrieve, update, delete
    path('', include(quizset_router.urls)),
]

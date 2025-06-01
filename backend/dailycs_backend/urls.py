from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from quiz.views import QuizSetViewSet, QuestionViewSet

router = DefaultRouter()
router.register('quizsets', QuizSetViewSet, basename='quizset')
router.register('questions', QuestionViewSet, basename='question')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]

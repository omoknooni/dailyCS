from django.db import models

CATEGORY_CHOICES = [
    ('OS', 'Operating Systems'),
    ('NET', 'Networking'),
    ('DB', 'Databases'),
    ('GIT', 'Git / DevOps'),
    ('CLOUD', 'Cloud'),
    ('SEC', 'Security'),
]

class QuizSet(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Question(models.Model):
    quiz_set = models.ForeignKey(QuizSet, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty_level = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Q{self.pk} of {self.quiz_set}'

class Choice(models.Model):
    question = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    text = models.TextField()
    order = models.PositiveSmallIntegerField()
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('question', 'order')
        ordering = ['order']

    def __str__(self):
        return f'Choice {self.order} of Q{self.question_id}'
from rest_framework import serializers
from .models import QuizSet, Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'order', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'quiz_set', 'question_text', 'explanation', 'difficulty_level', 'choices']

    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        for idx, choice_data in enumerate(choices_data):
            Choice.objects.create(question=question, order=idx+1, **choice_data)
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if choices_data is not None:
            instance.choices.all().delete()
            for idx, choice_data in enumerate(choices_data):
                Choice.objects.create(question=instance, order=idx+1, **choice_data)
        return instance

class QuizSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizSet
        fields = ['id', 'title', 'description', 'category', 'created_at', 'updated_at']
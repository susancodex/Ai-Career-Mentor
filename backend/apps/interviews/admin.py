from django.contrib import admin
from .models import InterviewSession, InterviewQuestion

admin.site.register(InterviewSession)
admin.site.register(InterviewQuestion)

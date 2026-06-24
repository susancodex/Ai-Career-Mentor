from django.contrib import admin
from .models import JobMatch, AsyncJob

admin.site.register(JobMatch)
admin.site.register(AsyncJob)

from django.urls import path

from bank import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("papers/generate/", views.generate_paper, name="generate-paper"),
    path("papers/draft/", views.current_draft, name="current-draft"),
    path("papers/draft/save/", views.save_draft, name="save-draft"),
    path("exams/submit/", views.submit_exam, name="submit-exam"),
    path("auth/demo-login/", views.demo_login, name="demo-login"),
]

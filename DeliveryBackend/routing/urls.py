from django.urls import path

from routing.views import ShortestPathView

urlpatterns = [
    path('shortest-path/', ShortestPathView.as_view(), name='shortest-path'),
]

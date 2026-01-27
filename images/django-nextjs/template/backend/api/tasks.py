"""
Sample Celery tasks.

Add your Celery tasks here. They will be automatically discovered
by Celery's autodiscover_tasks() function.
"""

from celery import shared_task


@shared_task
def sample_task():
    """
    A sample task that returns a simple message.

    Usage:
        from api.tasks import sample_task
        sample_task.delay()
    """
    return "Sample task executed successfully!"


@shared_task
def add(x, y):
    """
    A simple task that adds two numbers.

    Usage:
        from api.tasks import add
        result = add.delay(4, 4)
        result.get()  # Returns 8
    """
    return x + y

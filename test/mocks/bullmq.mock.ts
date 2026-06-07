export class Queue {
    add = jest.fn().mockResolvedValue({ id: "mock-job-id" });
    close = jest.fn().mockResolvedValue(undefined);
    obliterate = jest.fn().mockResolvedValue(undefined);
    on = jest.fn().mockReturnThis();
    pause = jest.fn().mockResolvedValue(undefined);
    resume = jest.fn().mockResolvedValue(undefined);
}

export class Worker {
    on = jest.fn().mockReturnThis();
    close = jest.fn().mockResolvedValue(undefined);
    run = jest.fn().mockResolvedValue(undefined);
}

export class Job {
    id = "mock-job-id";
    data = {};
    opts = {};
    progress = jest.fn().mockResolvedValue(undefined);
    updateProgress = jest.fn().mockResolvedValue(undefined);
    log = jest.fn().mockResolvedValue(undefined);
    remove = jest.fn().mockResolvedValue(undefined);
}

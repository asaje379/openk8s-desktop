export namespace cluster {
	
	export class AddClusterInput {
	    name: string;
	    kubeconfig: string;
	    context?: string;
	
	    static createFrom(source: any = {}) {
	        return new AddClusterInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.kubeconfig = source["kubeconfig"];
	        this.context = source["context"];
	    }
	}
	export class Cluster {
	    id: string;
	    name: string;
	    server: string;
	    currentContext: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Cluster(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.server = source["server"];
	        this.currentContext = source["currentContext"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ConnectionStatus {
	    connected: boolean;
	    server: string;
	    version: string;
	    message?: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.server = source["server"];
	        this.version = source["version"];
	        this.message = source["message"];
	    }
	}
	export class KubeContext {
	    name: string;
	    cluster: string;
	    user: string;
	    namespace?: string;
	    server: string;
	
	    static createFrom(source: any = {}) {
	        return new KubeContext(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.cluster = source["cluster"];
	        this.user = source["user"];
	        this.namespace = source["namespace"];
	        this.server = source["server"];
	    }
	}
	export class KubeconfigInfo {
	    currentContext: string;
	    contexts: KubeContext[];
	
	    static createFrom(source: any = {}) {
	        return new KubeconfigInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentContext = source["currentContext"];
	        this.contexts = this.convertValues(source["contexts"], KubeContext);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LocalKubeconfig {
	    path: string;
	    currentContext: string;
	    contexts: KubeContext[];
	
	    static createFrom(source: any = {}) {
	        return new LocalKubeconfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.currentContext = source["currentContext"];
	        this.contexts = this.convertValues(source["contexts"], KubeContext);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace k8s {
	
	export class ClusterMetrics {
	    cpuUsed: string;
	    cpuTotal: string;
	    memoryUsed: string;
	    memoryTotal: string;
	    cpuUsedMillis: number;
	    cpuTotalMillis: number;
	    memoryUsedBytes: number;
	    memoryTotalBytes: number;
	    totalsAvailable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ClusterMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuUsed = source["cpuUsed"];
	        this.cpuTotal = source["cpuTotal"];
	        this.memoryUsed = source["memoryUsed"];
	        this.memoryTotal = source["memoryTotal"];
	        this.cpuUsedMillis = source["cpuUsedMillis"];
	        this.cpuTotalMillis = source["cpuTotalMillis"];
	        this.memoryUsedBytes = source["memoryUsedBytes"];
	        this.memoryTotalBytes = source["memoryTotalBytes"];
	        this.totalsAvailable = source["totalsAvailable"];
	    }
	}
	export class ConfigMapDetail {
	    name: string;
	    namespace: string;
	    data: Record<string, string>;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new ConfigMapDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.data = source["data"];
	        this.age = source["age"];
	    }
	}
	export class ConfigMapInfo {
	    name: string;
	    namespace: string;
	    keys: string[];
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new ConfigMapInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.keys = source["keys"];
	        this.age = source["age"];
	    }
	}
	export class ContainerInfo {
	    name: string;
	    image: string;
	    ready: boolean;
	    restartCount: number;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.image = source["image"];
	        this.ready = source["ready"];
	        this.restartCount = source["restartCount"];
	        this.state = source["state"];
	    }
	}
	export class CronJobInfo {
	    name: string;
	    namespace: string;
	    schedule: string;
	    suspend: boolean;
	    active: number;
	    lastSchedule: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new CronJobInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.schedule = source["schedule"];
	        this.suspend = source["suspend"];
	        this.active = source["active"];
	        this.lastSchedule = source["lastSchedule"];
	        this.age = source["age"];
	    }
	}
	export class DeploymentDetail {
	    name: string;
	    namespace: string;
	    desired: number;
	    ready: number;
	    available: number;
	    image: string;
	    selector: Record<string, string>;
	    containers: string[];
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new DeploymentDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.desired = source["desired"];
	        this.ready = source["ready"];
	        this.available = source["available"];
	        this.image = source["image"];
	        this.selector = source["selector"];
	        this.containers = source["containers"];
	        this.age = source["age"];
	    }
	}
	export class EventInfo {
	    type: string;
	    reason: string;
	    message: string;
	    object: string;
	    kind: string;
	    namespace: string;
	    count: number;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new EventInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.reason = source["reason"];
	        this.message = source["message"];
	        this.object = source["object"];
	        this.kind = source["kind"];
	        this.namespace = source["namespace"];
	        this.count = source["count"];
	        this.age = source["age"];
	    }
	}
	export class IngressInfo {
	    name: string;
	    namespace: string;
	    class: string;
	    hosts: string[];
	    addresses: string[];
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new IngressInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.class = source["class"];
	        this.hosts = source["hosts"];
	        this.addresses = source["addresses"];
	        this.age = source["age"];
	    }
	}
	export class JobInfo {
	    name: string;
	    namespace: string;
	    completions: string;
	    duration: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new JobInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.completions = source["completions"];
	        this.duration = source["duration"];
	        this.age = source["age"];
	    }
	}
	export class NamespaceInfo {
	    name: string;
	    status: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new NamespaceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.status = source["status"];
	        this.age = source["age"];
	    }
	}
	export class NodeInfo {
	    name: string;
	    status: string;
	    roles: string[];
	    version: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new NodeInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.status = source["status"];
	        this.roles = source["roles"];
	        this.version = source["version"];
	        this.age = source["age"];
	    }
	}
	export class NodeMetrics {
	    name: string;
	    cpuUsed: string;
	    cpuTotal: string;
	    memoryUsed: string;
	    memoryTotal: string;
	    cpuUsedMillis: number;
	    cpuTotalMillis: number;
	    memoryUsedBytes: number;
	    memoryTotalBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new NodeMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.cpuUsed = source["cpuUsed"];
	        this.cpuTotal = source["cpuTotal"];
	        this.memoryUsed = source["memoryUsed"];
	        this.memoryTotal = source["memoryTotal"];
	        this.cpuUsedMillis = source["cpuUsedMillis"];
	        this.cpuTotalMillis = source["cpuTotalMillis"];
	        this.memoryUsedBytes = source["memoryUsedBytes"];
	        this.memoryTotalBytes = source["memoryTotalBytes"];
	    }
	}
	export class PodDetail {
	    name: string;
	    namespace: string;
	    status: string;
	    node: string;
	    ip: string;
	    createdAt: string;
	    restarts: number;
	    labels: Record<string, string>;
	    containers: ContainerInfo[];
	
	    static createFrom(source: any = {}) {
	        return new PodDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.status = source["status"];
	        this.node = source["node"];
	        this.ip = source["ip"];
	        this.createdAt = source["createdAt"];
	        this.restarts = source["restarts"];
	        this.labels = source["labels"];
	        this.containers = this.convertValues(source["containers"], ContainerInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PodInfo {
	    name: string;
	    namespace: string;
	    status: string;
	    ready: string;
	    restarts: number;
	    node: string;
	    ip: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new PodInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.status = source["status"];
	        this.ready = source["ready"];
	        this.restarts = source["restarts"];
	        this.node = source["node"];
	        this.ip = source["ip"];
	        this.age = source["age"];
	    }
	}
	export class PodMetrics {
	    name: string;
	    namespace: string;
	    cpu: string;
	    memory: string;
	
	    static createFrom(source: any = {}) {
	        return new PodMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.cpu = source["cpu"];
	        this.memory = source["memory"];
	    }
	}
	export class SearchResult {
	    kind: string;
	    name: string;
	    namespace: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	    }
	}
	export class SecretDetail {
	    name: string;
	    namespace: string;
	    type: string;
	    data: Record<string, string>;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new SecretDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.type = source["type"];
	        this.data = source["data"];
	        this.age = source["age"];
	    }
	}
	export class SecretInfo {
	    name: string;
	    namespace: string;
	    type: string;
	    keys: string[];
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new SecretInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.type = source["type"];
	        this.keys = source["keys"];
	        this.age = source["age"];
	    }
	}
	export class ServiceInfo {
	    name: string;
	    namespace: string;
	    type: string;
	    clusterIP: string;
	    externalIP: string;
	    ports: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new ServiceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.type = source["type"];
	        this.clusterIP = source["clusterIP"];
	        this.externalIP = source["externalIP"];
	        this.ports = source["ports"];
	        this.age = source["age"];
	    }
	}
	export class WorkloadInfo {
	    kind: string;
	    name: string;
	    namespace: string;
	    desired: number;
	    ready: number;
	    available: number;
	    image: string;
	    age: string;
	
	    static createFrom(source: any = {}) {
	        return new WorkloadInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.name = source["name"];
	        this.namespace = source["namespace"];
	        this.desired = source["desired"];
	        this.ready = source["ready"];
	        this.available = source["available"];
	        this.image = source["image"];
	        this.age = source["age"];
	    }
	}

}

export namespace update {
	
	export class Info {
	    currentVersion: string;
	    latestVersion: string;
	    tagName: string;
	    htmlUrl: string;
	    downloadUrl: string;
	    autoUpdateUrl: string;
	    sha256SumsUrl: string;
	    supportsAutoUpdate: boolean;
	    hasUpdate: boolean;
	    publishedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.tagName = source["tagName"];
	        this.htmlUrl = source["htmlUrl"];
	        this.downloadUrl = source["downloadUrl"];
	        this.autoUpdateUrl = source["autoUpdateUrl"];
	        this.sha256SumsUrl = source["sha256SumsUrl"];
	        this.supportsAutoUpdate = source["supportsAutoUpdate"];
	        this.hasUpdate = source["hasUpdate"];
	        this.publishedAt = source["publishedAt"];
	    }
	}

}


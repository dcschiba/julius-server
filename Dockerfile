FROM node:8.9.4

# LABEL io.openshift.s2i.scripts-url=image:///usr/lib/s2i

RUN apt-get update && \
    apt-get install -y --no-install-recommends sox && \
    apt-get clean && \
#   rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/* && \
#   mkdir /usr/lib/s2i && \
#   useradd --uid 1000 --gid 0 --home-dir /var/tmp --no-create-home --shell /usr/sbin/nologin httpd && \
    wget https://github.com/julius-speech/julius/archive/v4.4.2.1.tar.gz -O julius.tar.gz && \
    tar zxvf julius.tar.gz && \
    cd julius-4.4.2.1 && \
    ./configure && \
    make && \
    make install && \
    cd ..

RUN git clone https://github.com/dcschiba/julius-server.git && \
    cd julius-server && \
    chmod a+x ./run-julius.sh && \
    npm install
#   npm start

# COPY assemble run id_rsa /usr/lib/s2i/

# USER 1000
FROM ubuntu
SHELL ["/bin/bash", "-c"]
RUN  apt-get update -y  && \
     apt-get install -y git \
                        cmake \
                        make \
                        gcc \
                        g++ \
                        subversion \
                        curl \
                        python

RUN curl -L https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs
                        
RUN mkdir -p /build && cd /build && \
    svn export http://llvm.org/svn/llvm-project/llvm/trunk llvm && \
    mkdir -p /build/llvm/tools && cd /build/llvm/tools && \
    svn export http://llvm.org/svn/llvm-project/cfe/trunk clang

RUN mkdir -p /build/llvm/build && cd /build/llvm/build && \
    cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release -DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly .. && \
    make && \
    make install && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/ && \
    rm -rf /build
RUN cd / && \
    git clone https://github.com/WebAssembly/binaryen.git && \
    cd /binaryen && \
    cmake . && make && \
    cp /binaryen/bin/s2wasm /binaryen/bin/wasm-as /usr/local/bin && \
    rm -rf /binaryen

RUN mkdir /emscripten && cd /emscripten && \
    curl -L https://github.com/kripken/emscripten/archive/1.37.19.tar.gz -o emscripten-1.37.19.tar.gz && \
    tar zxvf emscripten-1.37.19.tar.gz emscripten-1.37.19/system && \
    mv emscripten-1.37.19/system system && rmdir emscripten-1.37.19 && \
    curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut.h?format=raw -o /emscripten/system/include/GL/freeglut.h && \
    curl https://sourceforge.net/p/freeglut/code/HEAD/tree/tags/FG_3_0_0/include/GL/freeglut_ext.h?format=raw -o /emscripten/system/include/GL/freeglut_ext.h

ADD system_lib-build.js /emscripten/
RUN nodejs /emscripten/system_lib-build.js

ADD .clang-format /

##

FROM mlaci/hedgehog-server

COPY app /app/

WORKDIR /app

RUN npm --unsafe-perm install

ENV NODE_ENV production

EXPOSE 8080

CMD ["npm", "start"]